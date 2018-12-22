import {
  Collection,
  ObjectID,
} from "mongodb";
import {
  Team,
} from "@models/team";
import {
  classToPlain,
} from "class-transformer";
import {
  db,
} from "@db/mongo";
import {
  SchedulerService,
} from "@services/scheduler-service";

const teamsCollection = "teams";

export class TeamService {

  private teamColl: Promise<Collection>;

  private schedulerService: SchedulerService;

  constructor(scheduler: SchedulerService) {
    this.schedulerService = scheduler;
    this.teamColl = db.then(db => db.collection(teamsCollection));
    this.teamColl
      .then(c => Promise.all([
        c.createIndex({ team_id: 1 }, { unique: true, dropDups: true }),
        c.createIndex({ name: 1 })
      ]))
      .then(data => console.log(`[team-service] indexes were created: ${data}`))
      .catch(err => console.error(err));
  }

  find(_id: any): Promise<Team> {
    if (typeof _id !== "object") _id = new ObjectID(_id);
    return this.resolveTeam({ _id });
  }

  private resolveTeam(q: any): Promise<Team> {
    return this.teamColl.then(c => c.findOne(q));
  }

  /**
   * Performs lookup by team id.` Team id is represented as telegram chat id.
   * @param team_id team id
   */
  getTeam(team_id: number): Promise<Team | null> {
    return this.resolveTeam({ team_id });
  }

  init(existing: Team, team: Team): Promise<Team> {
    return !!existing ? Promise.resolve(existing) : this.create(team).then(() => this.getTeam(team.team_id));
  }

  create(team: Team) {
    return this.teamColl.then(c => c.insertOne(classToPlain(team), { w: 1 }));
  }

  setSchedule(team: Team, scheduleDef: string): Promise<Boolean> {
    const schedule = this.schedulerService.parseSchedule(scheduleDef);
    if (!schedule || !schedule.length) return Promise.resolve(false);
    return this.teamColl.then(c => c.updateOne({ team_id: team.team_id }, { $set: { schedule: schedule } }))
      .then(r => Promise.resolve(r.result.ok == 1));
  }
}