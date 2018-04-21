import Telegraf from "telegraf"
import { BOT_TOKEN } from "./config"
import { db } from "./db"
import { TeamService } from "./services/team-service"

db.then(db => {
    const bot = new Telegraf(BOT_TOKEN)
    const teamService = new TeamService(db)

    bot.command('/newteam', ({ reply, chat }) => {
        teamService.create({ name: chat.title, chat_id: chat.id })
            .then(team => reply(`*Lets Play!*`, Telegraf.Extra.markdown()))
            .catch(err => console.log(`${err}`));
    });
    bot.use(ctx => console.log(`Context ${ctx.message}`))
    bot.startPolling()
});
