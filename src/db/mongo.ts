import { MongoClient } from "mongodb";
import { MONGO_URI, DATABASE_NAME } from "@configs/config";

export default MongoClient.connect(MONGO_URI).then(client => client.db(DATABASE_NAME));