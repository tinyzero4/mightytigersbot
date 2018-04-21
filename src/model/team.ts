import { ObjectId } from "bson";

interface MatchDay {
    day: number;
    time: string;
}

export interface Team {
    _id : ObjectId
    name: string;
    chat_id: string;
    created: Date;
    schedule: Array<MatchDay>;
}