import { ObjectId } from "bson";

interface Confirmation {
  confirmation: string;
  confirmationDate: Date;
}

interface Squad {
  [propName: string]: Confirmation;
}

interface WithMe {
  [propName: string]: number;
}

interface Players {
  [propName: string]: string;
}

enum MatchStatus {
  SCHEDULED,
  IN_PROGRESS,
  CANCELLED,
  INVALID,
  COMPLETED
}

interface Match {
  _id?: ObjectId;
  team_id: number;
  createdAt: Date;
  date: Date;
  squad: Squad;
  withMe?: WithMe;
  players?: Players;
  completed?: boolean;
  message_id?: number;
  status?: MatchStatus;
}

export {
  Match,
  MatchStatus,
};