import moment from "moment-timezone";
import shortId from "shortid";
import _ from "lodash";
import {
  Collection,
  ObjectID,
  InsertOneWriteOpResult,
  WithId,
} from "mongodb";
import {
  SchedulerService,
} from "@services/scheduler-service";
import {
  CONFIRMATION_TYPES,
} from "@configs/config";
import {
  TeamService,
} from "@services/team-service";
import db from "@db/mongo";
import {
  Match,
  MatchStatus,
} from "@models/match";

const matchesColl = "matches";
const updatesColl = "updates";

/**
 * Match confirmation event sent by player.
 */
export interface ConfirmationEvent {
  matchId: String;
  playerId: String;
  playerName: String;

  confirmationId: String;
  confirmation: String;
  withPlayer: number;
}

/**
 * Result of match confirmation event.
 */
class ConfirmationResult {
  match?: Match;
  success?: boolean;
  processed?: boolean;
}

export class MatchService {

  private matchColl: Collection<Match>;

  private updatesColl: Collection;

  private scheduleService: SchedulerService;

  private teamService: TeamService;

  constructor(scheduleService: SchedulerService, teamService: TeamService) {
    this.scheduleService = scheduleService;
    this.teamService = teamService;
  }

  public async init() {
    const _db = await db;
    this.matchColl = await _db.collection(matchesColl);
    this.updatesColl = await _db.collection(updatesColl);
    await Promise.all([
      this.matchColl.createIndex({team_id: 1, date: 1, completed: 1}),
      this.updatesColl.createIndex({processed: 1}, {expireAfterSeconds: 86400 * 3})
    ]);
  }

  /**
   * Returns latest scheduled(completed or not) match to play for given team.
   * @param team_id team id
   * @see Team
   */
  public async findLatest(team_id: number): Promise<Match | null> {
    return await this.matchColl.findOne({team_id}, {sort: {date: -1}});
  }

  /**
   * Performs lookup of match by id.
   * @param _id match id.
   */
  public async find(_id: any): Promise<Match | null> {
    if (typeof _id !== "object") _id = new ObjectID(_id);
    return this.matchColl.findOne({_id});
  }

  /**
   * Returns all schedules macthes for given team.
   * @param team_id team id.
   * @param season year season
   */
  public async findByTeam(team_id: any, season: number): Promise<Array<Match>> {
    const seasonDate = moment(season);
    return this.matchColl.find({
      team_id,
      createdAt: {$gte: seasonDate.startOf("year").toDate(), $lte: seasonDate.endOf("year").toDate()}
    }).sort({createdAt: 1}).toArray();
  }

  /**
   * Returns next match to play for a team. Schedules a new match if no has been already scheduled in future.
   * @param team_id team id.
   */
  public async nextMatch(team_id: number): Promise<any> {
    const match = await this.findLatest(team_id);
    if (!!match) {
      if (match.status == MatchStatus.SCHEDULED && !this.hasStarted(match, new Date())) return [match, false];
      else await this.completeMatch(match);
    }
    const next = await this.scheduleNextMatch(team_id);
    console.log(`2 ${JSON.stringify(next)}`);
    return [next, true];
  }

  private hasStarted(match: Match, now: Date): boolean {
    return match && match.date < now;
  }

  private async completeMatch(match: Match): Promise<void> {
    if (match && !match.completed) await this.complete(match._id);
  }

  private async scheduleNextMatch(team_id: number): Promise<Match> {
    const team = await this.teamService.getTeam(team_id);
    const date = this.scheduleService.nextMatchDate(team, new Date());
    const result = await this.create({
      date,
      team_id: team.team_id,
      createdAt: new Date(),
      squad: {},
      status: MatchStatus.SCHEDULED
    });
    return result.ops[0];
  }

  /**
   * Buils details information with stats for given match. Used in chat conversation logic.
   * @param match - match
   */
  public getMatchDetails(match: Match): any {
    let playingTotal = 0;
    const confirmationsByType = Object.keys(match.squad)
        .map(pId => {
          return {...match.squad[pId], pId};
        })
        .reduce((acc: any, p) => {
          acc[p.confirmation] = acc[p.confirmation] || [];
          acc[p.confirmation].push(p);
          if (this.isConfirmationToPlay(p.confirmation)) playingTotal++;
          return acc;
        }, {});

    const withMeTotal = match.withMe ? _.sumBy(Object.keys(match.withMe), (k) => match.withMe[k] > 0 ? match.withMe[k] : 0) : 0;
    Object.keys(confirmationsByType).forEach(k => confirmationsByType[k].sort((l, r) => l.confirmationDate - r.confirmationDate));

    return {
      id: match._id,
      uid: shortId.generate(),
      team_id: match.team_id,
      total: playingTotal + withMeTotal,
      confirmationsByType,
      players: match.players,
      confirmationTypes: CONFIRMATION_TYPES,
      withMe: match.withMe,
      date: moment.utc(match.date).tz("Europe/Minsk").format("ddd,DD.MM@HH:mm"),
      moment
    };
  }

  /**
   * Assigns chat message with provided match.
   * @param _id  - match id.
   * @param message_id - chat message id.
   */
  public async linkMessageToMatch(_id: any, message_id: number): Promise<number> {
    if (typeof _id !== "object") _id = new ObjectID(_id);
    await this.matchColl.findOneAndUpdate({_id}, {$set: {message_id}});
    return message_id;
  }

  private complete(_id: any, status: MatchStatus = MatchStatus.COMPLETED) {
    if (typeof _id !== "object") _id = new ObjectID(_id);
    return this.matchColl.findOneAndUpdate({_id}, {$set: {completed: true, status}});
  }

  public async processConfirmation(c: ConfirmationEvent): Promise<ConfirmationResult> {
    const shouldProcess = await this.shouldProcessConfirmation(c);
    if (!shouldProcess) return {processed: true};
    const result = await this.applyPlayerConfirmation(c);
    await this.saveConfirmationRequest(c);
    return result;
  }

  public async validateConfirmation(c: ConfirmationEvent): Promise<boolean> {
    const match = await this.find(c.matchId);
    if (!match || match.completed || this.hasStarted(match, new Date())) return false;

    return c.withPlayer ? !!match.squad[`${c.playerId}`] : true;
  }

  cancelObsoleteMatches(team_id): Promise<boolean> {
    return this.findLatest(team_id).then(match => {
      if (match && !match.completed && !this.hasStarted(match, new Date()))
        return this.complete(match._id, MatchStatus.CANCELLED).then(() => Promise.resolve(true));
      return Promise.resolve(false);
    });
  }

  private isConfirmationToPlay(confirmation: string): boolean {
    return CONFIRMATION_TYPES.filter(ct => ct.going && ct.value === confirmation).length > 0;
  }

  private shouldProcessConfirmation(event: ConfirmationEvent): Promise<boolean> {
    return this.updatesColl.findOne({_id: `${event.confirmationId}:${event.matchId}:${event.playerId}`})
        .then(r => r == undefined);
  }

  private saveConfirmationRequest(event: ConfirmationEvent): Promise<any> {
    return this.updatesColl.insertOne({
      _id: `${event.confirmationId}:${event.matchId}:${event.playerId}`,
      processed: new Date()
    }).then(r => r.ops[0]);
  }

  private async applyPlayerConfirmation(event: ConfirmationEvent): Promise<ConfirmationResult> {
    const update: any = {};

    if (event.confirmation) {
      Object.assign(update, {
        $set: {
          [`squad.${event.playerId}`]: {
            confirmation: event.confirmation,
            confirmationDate: new Date(),
          },
          [`players.${event.playerId}`]: event.playerName
        }
      });
    }
    if (event.withPlayer) {
      Object.assign(update, {
        $inc: {[`withMe.${event.playerId}`]: event.withPlayer},
        $set: {[`players.${event.playerId}`]: event.playerName}
      });
    }

    if (!Object.keys(update).length) return Promise.resolve({success: false});

    const query = {
      _id: new ObjectID(event.matchId.toString()),
      date: {$gte: moment.utc().toDate()}
    };

    try {
      const result = await this.matchColl.findOneAndUpdate(query, update, {returnOriginal: false});
      return {
        match: result.value,
        success: (result.ok === 1 && result.value != undefined)
      };
    } catch (e) {
      return {success: false};
    }
  }

  private async create(match: Match): Promise<InsertOneWriteOpResult<WithId<Match>>> {
    return this.matchColl.insertOne({
      ...match,
      createdAt: new Date(),
      squad: {},
      withMe: {},
      completed: false
    }, {w: 1});
  }
}
