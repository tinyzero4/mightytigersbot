import { Collection, Db, ObjectID } from "mongodb";
import { Team } from "../model/team";
import { Match } from "../model/match";
import { DEFAULT_SCHEDULE } from "../config";
import { MatchService } from "./match-service";
import moment from "moment";

const TEAMS_COLLECTION = "teams";

export class TeamService {

    private teamColl: Collection;

    private matchService: MatchService;

    constructor(private db: Db, matchService: MatchService) {
        this.teamColl = db.collection(TEAMS_COLLECTION);
        this.matchService = matchService;

        Promise.all([
            this.teamColl.createIndex({ team_id: 1 }, { unique: true, dropDups: true }),
            this.teamColl.createIndex({ name: 1 }, { unique: true, dropDups: true })

        ]).then(data => console.log(`[team-service] indexes were created: ${data}`))
          .catch(err => console.error(err));
    }

    nextMatch(team_id: number): Promise<any> {
        return this.matchService.findLatest(team_id)
            .then(match => {
                const now = new Date();
                if (match && match.date < now) this.matchService.complete(match._id);
                return (!match || match.date < now) ? this.scheduleNextMatch(team_id) : Promise.resolve([match, false]);
            });
    }

    private scheduleNextMatch(team_id: number): Promise<any> {
        return this.findByTeamId(team_id)
            .then(team => this.matchService.scheduleNextMatch(team))
            .then(match => [match, true]);
    }

    find(_id: any): Promise<Team> {
        if (typeof _id !== "object") _id = new ObjectID(_id);
        return this.teamColl.findOne({ _id });
    }

    findByTeamId(team_id: number): Promise<Team> {
        return this.teamColl.findOne({ team_id });
    }

    create(data: Team) {
        return this.teamColl.insertOne(Object.assign(data, { created: new Date(), schedule: DEFAULT_SCHEDULE }), { w: 1 });
    }

    delete(_id: any) {
        if (typeof _id !== "object") _id = new ObjectID(_id);
        return this.teamColl.deleteOne({ _id }, { w: 1 });
    }


}