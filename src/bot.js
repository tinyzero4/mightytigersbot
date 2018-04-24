import Telegraf from "telegraf"
import { BOT_TOKEN } from "./config"
import { db } from "./db"
import { TeamService } from "./services/team-service"
import { MatchService } from "./services/match-service"
import { ChatService } from "./services/chat-service"
import { ScheduleService } from "./services/schedule-service";

db.then(db => {
    const bot = new Telegraf(BOT_TOKEN)
    const scheduleService = new ScheduleService()
    const matchService = new MatchService(db, scheduleService)
    const teamService = new TeamService(db, matchService)
    const chatService = new ChatService()

    bot.command('/newteam', ({ reply, chat }) => {
        teamService.create({ name: chat.title, team_id: chat.id })
            .then(team => chatService.sendTeamGreeting(reply))
            .catch(err => console.error(`[bot] issue while new team creation ${err}`))
    });
    bot.command('/nextmatch', ({ reply, replyWithHTML, chat }) => {
        teamService.findByTeamId(chat.id)
            .then(team => {
                if (!team) chatService.sendTeamNotRegistered(reply);
                else teamService.nextMatch(chat.id)
                    .then(([match, created]) => {
                        if (match && created) chatService.sendMatchVoteMessage(replyWithHTML, matchService.matchStats(match))
                    }).catch(err => {
                        console.error(err)
                        chatService.sendOperationFailed(reply)
                    })
            })
    })
    bot.on('callback_query', (ctx) => {
        console.log(ctx.callbackQuery);
      })
    bot.use(ctx => {
        console.log(`Context ${ctx.callbackQuery}`)
    })
    bot.startPolling()
}).catch(err => {
    console.error(`[bot] startup error ${err}`)
    process.exit(1)
})
