import { Collection, Db, MongoClient, ObjectID } from "mongodb";

const { uri, db, teamsCollection } = require("./config");

let coll: any;

module.exports = () => MongoClient.connect(uri).then((c: MongoClient) => coll = c.db(db).collection(teamsCollection));

interface Team {
    name: string;
    chat_id: string;
    
}

module.exports.Team = {
    find(_id: string) {
        return coll.findOne({ _id: new ObjectID(_id) });
    },
    create(data: Team) {
        return coll.insertOne(Object.assign(data, { created: new Date() }), { w: 1 });
    },
    delete(_id: string) {
        return coll.deleteOne({ _id: new ObjectID(_id) }, { w: 1 });
    }
};