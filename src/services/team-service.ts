import {
  Collection,
  ObjectID,
} from "mongodb";
import { Team } from "@models/team";
import { classToPlain } from "class-transformer";
import { db } from "@db/mongo";

const teamsCollection = "teams";

export class TeamService {

  private teamColl: Promise<Collection>;

  constructor() {
    this.teamColl = db.then(db => db.collection(teamsCollection));
    this.teamColl
      .then(c => {
        console.log(`Building indexes`);
        return Promise.all([
          c.createIndex({ team_id: 1 }, { unique: true, dropDups: true }),
          c.createIndex({ name: 1 })
        ]);
      })
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
  findByTeamId(team_id: number): Promise<Team | null> {
    return this.resolveTeam({ team_id });
  }

  create(team: Team) {
    return this.teamColl.then(c => c.insertOne(classToPlain(team), { w: 1 }));
  }

}