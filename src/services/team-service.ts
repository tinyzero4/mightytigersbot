import {
  Collection,
} from "mongodb";
import {
  Team,
} from "@models/team";
import {
  classToPlain,
} from "class-transformer";
import db from "@db/mongo";
import {
  SchedulerService,
} from "@services/scheduler-service";

const teamsCollection = "teams";

export class TeamService {

  private teamColl: Collection;
  private schedulerService: SchedulerService;

  constructor(scheduler: SchedulerService) {
    this.schedulerService = scheduler;
  }

  public async init() {
    const _db = await db;
    this.teamColl = await _db.collection(teamsCollection);
    await Promise.all([
      this.teamColl.createIndex({team_id: 1}, {unique: true, dropDups: true}),
      this.teamColl.createIndex({name: 1})
    ]);
  }

  public async resolveTeam(definition: Team): Promise<Team> {
    const team = await this.getTeam(definition.team_id);
    return this.initTeam(team, definition);
  }

  /**
   * Performs lookup by team id.` Team id is represented as telegram chat id.
   * @param team_id team id
   */
  public async getTeam(team_id: number): Promise<Team | null> {
    return this.teamColl.findOne({team_id});
  }

  public async initTeam(existing: Team, team: Team): Promise<Team> {
    return existing || this.createTeam(team);
  }

  public async createTeam(team: Team): Promise<Team> {
    await this.teamColl.insertOne(classToPlain(team), {w: 1});
    return this.getTeam(team.team_id);
  }

  public async setSchedule(team: Team, scheduleDef: string): Promise<Boolean> {
    const schedule = this.schedulerService.parseSchedule(scheduleDef);
    if (!schedule) return false;

    const r = await this.teamColl.updateOne({team_id: team.team_id}, {$set: {schedule: schedule}});
    return r.result.ok == 1;
  }
}
