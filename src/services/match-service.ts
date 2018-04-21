import { Collection, Db, ObjectID, ObjectId } from "mongodb";
import { Match } from "../model/match";

const MATCHES_COLLECTION = "matches";

export interface Confirmation {

}

export class MatchService {

    private collection: Collection;

    constructor(private db: Db) {
        this.collection = db.collection(MATCHES_COLLECTION);
        this.collection.createIndex({ team_id: 1, date: 1, completed: 1 }).catch(err => console.log(err));
    }

    create(match: Match) {
        this.collection.insert(Object.assign(match, { squad: [], completed: false }), { w: 1 })
    }

    findLatest(team_id: number) {
        this.collection.findOne({ team_id }, { sort: { date: -1 } })
    }

    find(_id: string) {
        return this.collection.findOne({ _id: new ObjectID(_id) });
    }

    applyConfirmation() {

    }

    complete(_id: string) {
        this.collection.findOneAndUpdate({ _id: new ObjectId(_id) }, { $set: { completed: true } })
    }
}