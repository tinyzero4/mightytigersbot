import { MongoClient } from "mongodb";
import { MONGO_URI, DB } from "./config";

const db = MongoClient.connect(MONGO_URI).then(client => client.db(DB));
export { db };