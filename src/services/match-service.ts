import { Collection, Db, ObjectID, ObjectId, InsertOneWriteOpResult } from "mongodb";
import { Match } from "../model/match";
import { Team } from "../model/team";
import { ScheduleService } from "./schedule-service";
import moment from "moment";

const MATCHES_COLLECTION = "matches";

export class MatchService {

    private collection: Collection;

    private scheduleService: ScheduleService;

    constructor(db: Db, scheduleService: ScheduleService) {
        this.scheduleService = scheduleService;
        this.collection = db.collection(MATCHES_COLLECTION);
        this.collection.createIndex({ team_id: 1, date: 1, completed: 1 })
            .then(data => console.log(`[match-service] indexes were created: ${data}`))
            .catch(err => console.error(`[match-service] index creation issues ${err}`));
    }

    create(match: Match): Promise<InsertOneWriteOpResult> {
        return this.collection.insert(Object.assign(match, { createdAt: new Date(), squad: [], completed: false }), { w: 1 });
    }

    findLatest(team_id: number): Promise<Match> {
        return this.collection.findOne({ team_id }, { sort: { date: -1 } });
    }

    find(_id: any): Promise<Match> {
        if (typeof _id !== "object") _id = new ObjectID(_id);
        return this.collection.findOne({ _id });
    }

    scheduleNextMatch(team: Team): Promise<any> {
        const date = this.scheduleService.nextMatchDate(team, new Date());
        return this.create({ team_id: team.team_id, createdAt: new Date(), date }).then(({ ops }) => ops[0]);
    }

    matchStats(match: Match): any {
        return {
            date: moment.utc(match.date).format("ddd,MMM.DD@HH:mm")
        };
    }

    applyConfirmation(): void {

    }

    complete(_id: any) {
        if (typeof _id !== "object") _id = new ObjectID(_id);
        return this.collection.findOneAndUpdate({ _id }, { $set: { completed: true } });
    }
}