export const BOT_TOKEN = process.env.BOT_TOKEN || "613897973:AAErvvp5hsTX61Cz3kshjSADQZx3eeCrjuw";
export const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/tigers";
export const DATABASE_NAME = process.env.MONGO_DB || "tigers";
export const SSL_CERT = process.env.SSL_CERT_PATH || "/opt/mightytigers/aws.pem";
export const SSL_KEY = process.env.SSL_KEY_PATH || "/opt/mightytigers/aws.key";
export const VERSION = "1.0.8";

export const DEFAULT_SCHEDULE = [
  { day: 2, time: "05:30" },
  { day: 5, time: "05:30" },
];

export const CONFIRMATION_TYPES = [
  { value: "⚽", label: "⚽[PLAY]", going: true },
  { value: "🍷", label: "🍷[SLEEP]", going: false },
  { value: "🤔", label: "🤔[?]", going: false },
];

export const WITH_ME_TYPES = [
  "+1",
  "-1",
];

export const MATCH_MIN_PLAYERS = 8;
