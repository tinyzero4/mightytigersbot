import { ObjectId } from "bson";

interface Player {
    id: string,
    name: string,
    confirmation: string,
    confirmationAt: Date,
    withMe: number
}

export interface Match {
    _id : ObjectId;
    team_id: number;
    createdAt: Date;
    date: Date;
    squad: Array<Player>;
    completed: boolean
}