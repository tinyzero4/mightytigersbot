const Telegraf = require('telegraf')
const teams = require('./teams') 

let token = "588400254:AAHRYluiI7th2eIK4VdskgP_VegSljGqeVk"
const bot = new Telegraf(token)

bot.command('/newteam', ctx => {
    teams().then(() => {
        teams.Team.create({name: ctx.chat.title, chat_id: ctx.chat.id}).then(t => console.log(t))
        ctx.reply('👍')
    })
});

bot.use(ctx => console.log(ctx.message))
bot.catch(err => console.log('Ooops', err))
bot.startPolling()