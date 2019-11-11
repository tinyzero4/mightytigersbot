import { ObjectId } from "bson";
import { Type } from "class-transformer";
import { DEFAULT_SCHEDULE } from "@configs/config";

export class MatchDay {
    day: number;
    time: string;
}
export interface PlayerProfile {
    karma?: number;
}

export class Team {
    public _id?: ObjectId;
    public name: string;
    public team_id: number;
    public created: Date;
    @Type(() => MatchDay)
    public schedule: MatchDay[];
    public players?: Record<string, PlayerProfile>;

    constructor(name: string, team_id: number, schedule: MatchDay[] = DEFAULT_SCHEDULE) {
        this.name = name;
        this.team_id = team_id;
        this.created = new Date();
        this.schedule = schedule;
    }
}
