import moment from "moment-timezone";
import shortId from "shortid";
import _ from "lodash";
import { Collection, ObjectID, InsertOneWriteOpResult } from "mongodb";
import { Match } from "@models/match";
import { Team } from "@models/team";
import { SchedulerService } from "@services/scheduler-service";
import { CONFIRMATION_TYPES } from "@configs/config";
import { TeamService } from "@services/team-service";
import { db } from "@db/mongo";

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

  private matchColl: Promise<Collection<Match>>;

  private updatesColl: Promise<Collection>;

  private scheduleService: SchedulerService;

  private teamService: TeamService;

  constructor(scheduleService: SchedulerService, teamService: TeamService) {
    this.scheduleService = scheduleService;
    this.teamService = teamService;
    this.matchColl = db.then(db => db.collection(matchesColl));
    this.updatesColl = db.then(db => db.collection(updatesColl));
    this.matchColl.then(c => c.createIndex({ team_id: 1, date: 1, completed: 1 }));
    this.updatesColl.then(c => c.createIndex({ processed: 1 }, { expireAfterSeconds: 86400 * 3 }));
  }

  /**
   * Returns latest scheduled(completed or not) match to play for given team.
   * @param team_id team id
   * @see Team
   */
  findLatest(team_id: number): Promise<Match | null> {
    return this.matchColl.then(c => c.findOne({ team_id }, { sort: { date: -1 } }));
  }

  /**
   * Performs lookup of match by id.
   * @param _id match id.
   */
  find(_id: any): Promise<Match | null> {
    if (typeof _id !== "object") _id = new ObjectID(_id);
    return this.matchColl.then(c => c.findOne({ _id }));
  }

  /**
   * Returns all schedules macthes for given team.
   * @param team_id team id.
   */
  findByTeam(team_id: any, season: number): Promise<Array<Match>> {
    const seasonDate = moment(season);
    return this.matchColl.then(
      c => c.find({ team_id, createdAt: { $gte: seasonDate.startOf("year").toDate(), $lte: seasonDate.endOf("year").toDate() } })
        .sort({ createdAt: 1 })
        .toArray()
    );
  }
  /**
   * Returns next match to play for a team. Schedules a new match if no has been already scheduled in future.
   * @param team_id team id.
   */
  nextMatch(team_id: number): Promise<any> {
    return this.findLatest(team_id).then(match => {
      const now = new Date();
      if (!match || !this.hasMatchStarted(match, now)) return Promise.resolve([match, false]);
      if (this.shouldCompleteMatch(match, now)) this.completeMatch(match);

      return this.teamService.findByTeamId(team_id)
        .then(team => !!team ? this.scheduleNextMatch(team) : undefined)
        .then(match => [match, !!match]);
    });
  }

  private hasMatchStarted(match: Match, now: Date): boolean {
    return match && match.date < now;
  }

  private shouldCompleteMatch(match: Match, now: Date): boolean {
    return !match || !match.completed && match.date < now;
  }

  private completeMatch(match: Match): void {
    if (match && !match.completed) this.complete(match._id);
  }

  private scheduleNextMatch(team: Team): Promise<Match> {
    const date = this.scheduleService.nextMatchDate(team, new Date());
    return this.create({ date, team_id: team.team_id, createdAt: new Date(), squad: {} }).then(({ ops }) => ops[0]);
  }

  /**
   * Buils details information with stats for given match. Used in chat conversation logic.
   * @param match - match
   */
  getMatchDetails(match: Match): any {
    let playingTotal = 0;
    const confirmationsByType = Object.keys(match.squad)
      .map(pId => { return { ...match.squad[pId], pId }; })
      .reduce((acc: any, p) => {
        acc[p.confirmation] = acc[p.confirmation] || [];
        acc[p.confirmation].push(p);
        if (this.isConfimationToPlay(p.confirmation)) playingTotal++;
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
  linkMessageToMatch(_id: any, message_id: number): Promise<number> {
    if (typeof _id !== "object") _id = new ObjectID(_id);
    return this.matchColl.then(c => c.findOneAndUpdate({ _id }, { $set: { message_id } }).then(() => message_id));
  }

  complete(_id: any) {
    if (typeof _id !== "object") _id = new ObjectID(_id);
    return this.matchColl.then(c => c.findOneAndUpdate({ _id }, { $set: { completed: true } }));
  }

  processConfirmation(c: ConfirmationEvent): Promise<ConfirmationResult> {
    return this.shouldProcessConfirmation(c).then(process => {
      if (!process) return { processed: true };
      return this.applyPlayerConfirmation(c).then(data => this.saveConfirmationRequest(c).then(() => data));
    });
  }

  validateConfirmation(c: ConfirmationEvent): Promise<boolean> {
    if (!c.withPlayer) return Promise.resolve(true);
    return this.find(c.matchId).then(m => {
      console.log(`${JSON.stringify(m.squad)}`);

      const a = m.squad[`${c.playerId}`];
      console.log(`a=${a}`);
      return !!m.squad[`${c.playerId}`];
    });
  }

  private isConfimationToPlay(confirmation: string): boolean {
    return CONFIRMATION_TYPES.filter(ct => ct.going && ct.value === confirmation).length > 0;
  }

  private shouldProcessConfirmation(event: ConfirmationEvent): Promise<boolean> {
    return this.updatesColl.then(c => c.findOne({ _id: `${event.confirmationId}:${event.matchId}:${event.playerId}` }).then(r => r == undefined));
  }

  private saveConfirmationRequest(event: ConfirmationEvent): Promise<any> {
    return this.updatesColl.then(c => c.insert({ _id: `${event.confirmationId}:${event.matchId}:${event.playerId}`, processed: new Date() }).then(r => r.ops[0]));
  }

  private applyPlayerConfirmation(event: ConfirmationEvent): Promise<ConfirmationResult> {
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
        $inc: { [`withMe.${event.playerId}`]: event.withPlayer },
        $set: { [`players.${event.playerId}`]: event.playerName }
      });
    }

    if (!Object.keys(update).length) return Promise.resolve({ success: false });

    const query = {
      _id: new ObjectID(event.matchId.toString()),
      date: { $gte: moment.utc().toDate() }
    };
    return this.matchColl.then(c => c.findOneAndUpdate(query, update, { returnOriginal: false }))
      .then(result => Promise.resolve({ match: result.value, success: (result.ok === 1 && result.value != undefined) }))
      .catch(err => {
        console.error(`[match-service] error applying confirmation ${JSON.stringify(event)}. Reason: ${err}`);
        return Promise.resolve({ success: false });
      });
  }

  private create(match: Match): Promise<InsertOneWriteOpResult> {
    return this.matchColl.then(c => c.insert({ ...match, createdAt: new Date(), squad: {}, withMe: {}, completed: false }, { w: 1 }));
  }
}