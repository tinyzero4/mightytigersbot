export const BOT_TOKEN = process.env.BOT_TOKEN || "613897973:AAErvvp5hsTX61Cz3kshjSADQZx3eeCrjuw";
export const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/tigers";
export const DATABASE_NAME = process.env.MONGO_DB || "tigers";
export const SSL_CERT_PATH = process.env.SSL_CERT_PATH || "./tigers-certificate.pem";
export const SSL_KEY_PATH = process.env.SSL_KEY_PATH || "./tigers-certificate.key";
export const VERSION = "1.0.1";

export const DEFAULT_SCHEDULE = [
  { day: 1, time: "05:00" },
  { day: 4, time: "05:00" },
];

export const CONFIRMATION_TYPES = [
  { value: "⚽", label: "⚽[PLAY]", going: true },
  { value: "💩", label: "💩[SLEEP]", going: false },
  { value: "🤔", label: "🤔[?]", going: false },
];

export const WITH_ME_TYPES = [
  "+1",
  "-1",
];