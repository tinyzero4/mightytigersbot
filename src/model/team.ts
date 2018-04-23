import { ObjectId } from "bson";

export interface MatchDay {
    day: number;
    time: string;
}

export interface Team {
    _id: ObjectId;
    name: string;
    team_id: number;
    created: Date;
    schedule: Array<MatchDay>;
}