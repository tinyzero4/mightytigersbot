import { MongoClient, Db } from "mongodb";
import { MONGO_URI, DB_NAME } from "./config";

class DbClient {

    public db: Db;

    public async connect() {
        try {
            const client: MongoClient = await MongoClient.connect(MONGO_URI);
            this.db = await client.db(DB_NAME);
            return this.db;
        } catch (error) {
            console.log(`Unable to connect to ${MONGO_URI}`);
        }
    }
}
const client: DbClient = new DbClient();

export { client };