import { MongoClient } from "mongodb";
import { MONGO_URI, DATABASE_NAME } from "../configs/config";

const db = MongoClient.connect(MONGO_URI).then(client => client.db(DATABASE_NAME));
export { db };