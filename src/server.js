import Telegraf from "telegraf"
import { BOT_TOKEN } from "./config"
import { client } from "./db-client"
import { TeamManager } from "./teams"

const bot = new Telegraf(BOT_TOKEN)
const db = client.connect()

bot.command('/newteam', ctx => {
    db.then(db => {
        ctx.reply(`👍 ${db.databaseName} ${ctx.chat.title} ${ctx.chat.id}`);
        console.log(db.databaseName);
    })
});
bot.use(ctx => console.log(`Context ${ctx.message}`))
bot.startPolling()