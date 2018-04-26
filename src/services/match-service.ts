import { Collection, Db, ObjectID, ObjectId, InsertOneWriteOpResult } from "mongodb";
import { Match } from "../model/match";
import { Team } from "../model/team";
import { ScheduleService } from "./schedule-service";
import moment from "moment";
import shortId from "shortid";

const MATCHES_COLLECTION = "matches";
const CONFIRMATIONS_COLLECTION = "confirms";

interface ConfirmationRequest {
    matchId: String;
    confirmationId: String;
    confirmation: String;
    withMe: number;
    pId: String;
    name: String;
}

interface ConfirmationResult {
    match?: Match;
    success?: boolean;
    processed?: boolean;
}

export class MatchService {

    private matchColl: Collection<Match>;

    private confirmColl: Collection;

    private scheduleService: ScheduleService;

    constructor(db: Db, scheduleService: ScheduleService) {
        this.scheduleService = scheduleService;
        this.matchColl = db.collection(MATCHES_COLLECTION);
        this.confirmColl = db.collection(CONFIRMATIONS_COLLECTION);
        Promise.all([
            this.matchColl.createIndex({ team_id: 1, date: 1, completed: 1 }),
            this.confirmColl.createIndex({ processed: 1 }, { expireAfterSeconds: 86400 * 3 })
        ]).then(data => console.log(`[match-service] indexes were created: ${data}`))
            .catch(err => console.error(`[match-service] index creation issues ${err}`));
    }

    create(match: Match): Promise<InsertOneWriteOpResult> {
        return this.matchColl.insert(Object.assign(match, { createdAt: new Date(), squad: {}, completed: false }), { w: 1 });
    }

    findLatest(team_id: number): Promise<Match> {
        return this.matchColl.findOne({ team_id }, { sort: { date: -1 } });
    }

    find(_id: any): Promise<Match> {
        if (typeof _id !== "object") _id = new ObjectID(_id);
        return this.matchColl.findOne({ _id });
    }

    scheduleNextMatch(team: Team): Promise<any> {
        const date = this.scheduleService.nextMatchDate(team, new Date());
        return this.create({ team_id: team.team_id, createdAt: new Date(), date }).then(({ ops }) => ops[0]);
    }

    matchStats(match: Match): any {
        return {
            id: match._id,
            uid: shortId.generate(),
            team_id: match.team_id,
            date: moment.utc(match.date).format("ddd,DD.MM@HH:mm")
        };
    }

    setMatchMessage(_id: any, message_id: number) {
        if (typeof _id !== "object") _id = new ObjectID(_id);
        return this.matchColl.findOneAndUpdate({ _id }, { $set: { message_id } });
    }

    complete(_id: any) {
        if (typeof _id !== "object") _id = new ObjectID(_id);
        return this.matchColl.findOneAndUpdate({ _id }, { $set: { completed: true } });
    }

    applyConfirmation(c: ConfirmationRequest): Promise<ConfirmationResult> {
        return this.shouldProcessConfirmation(c).then(process => {
            if (!process) return { processed: true };
            return this.applyPlayerConfirmation(c);
        });
    }

    private shouldProcessConfirmation(c: ConfirmationRequest): Promise<boolean> {
        return this.confirmColl.findOne({ _id: c.confirmationId }).then(r => r == undefined);
    }

    private saveConfirmationRequest(c: ConfirmationRequest): Promise<any> {
        return this.confirmColl.insert({ _id: c.confirmationId, processed: new Date() }).then(r => r.ops[0]);
    }

    private applyPlayerConfirmation(c: ConfirmationRequest): Promise<ConfirmationResult> {
        const player: any = { [`players.${c.pId}`]: c.name };
        const update: any = {};

        if (c.confirmation) {
            Object.assign(update, {
                $set: {
                    [`squad.${c.pId}`]: {
                        confirmation: c.confirmation,
                        confimationDate: new Date(),
                    },
                    [`players.${c.pId}`]: c.name
                }
            });
        }
        if (c.withMe) {
            Object.assign(update, {
                $inc: { [`withMe.${c.pId}`]: c.withMe },
                $set: { [`players.${c.pId}`]: c.name }
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
}