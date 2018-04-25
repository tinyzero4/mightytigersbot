export const BOT_TOKEN = process.env.BOT_TOKEN || "588400254:AAHRYluiI7th2eIK4VdskgP_VegSljGqeVk";
export const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/tigers";
export const DB = "tigers";
export const DEFAULT_SCHEDULE = [{ day: 1, time: "08:00" }, { day: 4, time: "08:00" }];
export const CONFIRMATIONS = [
    {v: "⚽", btn: "⚽[PLAY]" }, {v: "💩", btn: "💩[SLEEP]"}, {v: "🤔", btn: "🤔[?]"}
];
export const CONFIRMATIONS_WITH_ME = ["+1", "-1"];