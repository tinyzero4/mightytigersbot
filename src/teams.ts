import { Collection, Db, MongoClient, ObjectID } from "mongodb";
import { DB_NAME } from "./config";

export const TEAMS_COLLECTION = "teams";

export interface Team {
    name: string;
    chat_id: string;
    created: Date;
}

export class TeamManager {

    private collection: Collection;

    constructor(private db: Db) {
        this.collection = db.collection(TEAMS_COLLECTION);
    }

    find(_id: string) {
        return this.collection.findOne({ _id: new ObjectID(_id) });
    }

    create(data: Team) {
        return this.collection.insertOne(Object.assign(data, { created: new Date() }), { w: 1 });
    }

    delete(_id: string) {
        return this.collection.deleteOne({ _id: new ObjectID(_id) }, { w: 1 });
    }
}