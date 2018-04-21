import { Collection, Db, ObjectID } from "mongodb";
import { Team } from "../model/team";
import { Match } from "../model/match";
import { DEFAULT_SCHEDULE } from "../config";
import { MatchService } from "./match-service"

const TEAMS_COLLECTION = "teams";

export class TeamService {

    private collection: Collection;

    private matchService: MatchService;

    constructor(private db: Db) {
        this.collection = db.collection(TEAMS_COLLECTION);
        this.matchService = new MatchService(db);

        Promise.all([
            this.collection.createIndex({ chat_id: 1 }, { unique: true, dropDups: true })
                .catch(err => console.log(err)),
            this.collection.createIndex({ name: 1 }, { unique: true, dropDups: true })
                .catch(err => console.log(err))

        ]).then(data => console.log(`indexes were created: ${data}`));
    }

    nextMatch(team_id: number) {
        
    }

    find(_id: string) {
        return this.collection.findOne({ _id: new ObjectID(_id) });
    }

    findByChatId(chat_id: number) {
        return this.collection.findOne({ chat_id });
    }

    create(data: Team) {
        return this.collection.insertOne(Object.assign(data, { created: new Date(), schedule: DEFAULT_SCHEDULE }), { w: 1 });
    }

    delete(_id: string) {
        return this.collection.deleteOne({ _id: new ObjectID(_id) }, { w: 1 });
    }


}