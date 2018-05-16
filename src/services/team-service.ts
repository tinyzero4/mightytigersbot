import { Collection, Db, ObjectID } from "mongodb";
import { Team } from "@models/team";
import {
  classToPlain,
  plainToClass,
} from "class-transformer";

const teamsCollection = "teams";

export class TeamService {

  private teamColl: Collection;

  constructor(db: Db) {
    this.teamColl = db.collection(teamsCollection);

    Promise.all([
      this.teamColl.createIndex({ team_id: 1 }, { unique: true, dropDups: true }),
      this.teamColl.createIndex({ name: 1 })

    ]).then(data => console.log(`[team-service] indexes were created: ${data}`))
      .catch(err => console.error(err));
  }

  find(_id: any): Promise<Team> {
    if (typeof _id !== "object") _id = new ObjectID(_id);
    return this.resolveTeam({ _id });
  }

  private resolveTeam(q: any): Promise<Team> {
    let result: Promise<Team> = this.teamColl.findOne(q);
    return result.then(team => plainToClass(Team, team));
  }

  /**
   * Performs lookup by team id. Team id is represented as telegram chat id.
   * @param team_id team id
   */
  findByTeamId(team_id: number): Promise<Team | null> {
    return this.resolveTeam({ team_id });
  }

  create(team: Team) {
    return this.teamColl.insertOne(classToPlain(team), { w: 1 });
  }

}