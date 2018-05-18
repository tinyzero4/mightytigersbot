import moment from "moment-timezone";
import shortId from "shortid";
import _ from "lodash";
import { Collection, Db, ObjectID, InsertOneWriteOpResult } from "mongodb";
import { Match } from "@models/match";
import { Team } from "@models/team";
import { SchedulerService } from "@services/scheduler-service";
import { CONFIRMATION_TYPES } from "@configs/config";
import { TeamService } from "@services/team-service";
import connection from "@db/mongo";

const matchCollection = "matches";
const confirmCollection = "confirms";

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
    this.matchColl = connection.then(db => db.collection(matchCollection));
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
   * Returns next match to play for a team. Schedules a new match if no has been already scheduled in future.
   * @param team_id team id.
   */
  nextMatch(team_id: number): Promise<any> {
    return this.findLatest(team_id).then(match => {
      if (this.shouldCompleteMatch(match, new Date())) {
        this.completeMatch(match);
        return this.teamService.findByTeamId(team_id)
          .then(team => team ? this.scheduleNextMatch(team) : undefined)
          .then(match => [match, !!match]);
      } else {
        return Promise.resolve([match, false]);
      }
    });
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
   * Buils details information with stats for given match. Used in char conversation logic.
   * @param match - match
   */
  getMatchDetails(match: Match): any {
    let playingTotal = 0;
    const confirmationsByType = Object.keys(match.squad)
      .map(pId => Object.assign({}, { pId }, match.squad[pId]))
      .reduce((acc: any, p) => {
        acc[p.confirmation] = acc[p.confirmation] || [];
        acc[p.confirmation].push(p);
        if (this.isConfimationToPlay(p.confirmation)) playingTotal++;
        return acc;
      }, {});

    const withMeTotal = match.withMe ? _.sumBy(Object.keys(match.withMe), (k) => match.withMe[k] > 0 ? match.withMe[k] : 0) : 0;
    Object.keys(confirmationsByType).forEach(k => confirmationsByType[k].sort((l, r) => l - r));

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
    return this.matchColl.then(c => c.findOneAndUpdate({ _id }, { $set: { message_id } }).then(() => message_id);
  }

  complete(_id: any) {
    if (typeof _id !== "object") _id = new ObjectID(_id);
    return this.matchColl.findOneAndUpdate({ _id }, { $set: { completed: true } });
  }

  processConfirmation(c: ConfirmationEvent): Promise<ConfirmationResult> {
    return this.shouldProcessConfirmation(c)
      .then(process => {
        if (!process) return { processed: true };
        return this.applyPlayerConfirmation(c)
          .then(data => this.saveConfirmationRequest(c).then(() => data));
      });
  }

  private isConfimationToPlay(confirmation: string): boolean {
    return CONFIRMATION_TYPES.filter(ct => ct.going && ct.value === confirmation).length > 0;
  }

  private shouldProcessConfirmation(c: ConfirmationEvent): Promise<boolean> {
    return this.updatesColl.findOne({ _id: c.confirmationId }).then(r => r == undefined);
  }

  private saveConfirmationRequest(c: ConfirmationEvent): Promise<any> {
    return this.updatesColl.insert({ _id: c.confirmationId, processed: new Date() }).then(r => r.ops[0]);
  }

  private applyPlayerConfirmation(c: ConfirmationEvent): Promise<ConfirmationResult> {
    const update: any = {};

    if (c.confirmation) {
      Object.assign(update, {
        $set: {
          [`squad.${c.playerId}`]: {
            confirmation: c.confirmation,
            confimationDate: new Date(),
          },
          [`players.${c.playerId}`]: c.playerName
        }
      });
    }
    if (c.withPlayer) {
      Object.assign(update, {
        $inc: { [`withMe.${c.playerId}`]: c.withPlayer },
        $set: { [`players.${c.playerId}`]: c.playerName }
      });
    }

    if (!Object.keys(update).length) return Promise.resolve({ success: false });

    return this.matchColl.findOneAndUpdate({ _id: new ObjectID(c.matchId.toString()) }, update, { returnOriginal: false })
      .then(result => Promise.resolve({ match: result.value, success: (result.ok === 1 && result.value != undefined) }))
      .catch(err => {
        console.error(`[match-service] error applying confirmation ${JSON.stringify(c)}. Reason: ${err}`);
        return Promise.resolve({ success: false });
      });
  }

  private create(match: Match): Promise<InsertOneWriteOpResult> {
    return this.matchColl.insert({ ...match, createdAt: new Date(), squad: {}, withMe: {}, completed: false }, { w: 1 });
  }
}