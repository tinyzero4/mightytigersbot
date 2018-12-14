import { MongoClient } from "mongodb";
import { MONGO_URI, DATABASE_NAME } from "@configs/config";

const connection = MongoClient.connect(MONGO_URI);
const db = connection.then(c => c.db(DATABASE_NAME));

const collection = (collName: string) => {
    const coll = db.then(db => db.collection(collName));
    return (action) => coll.then(c => action(c));
};

export {
    connection,
    db,
    collection,
};