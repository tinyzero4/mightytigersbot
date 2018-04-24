const Telegraf = require("telegraf")
const Mustache = require("mustache")

const Extra = Telegraf.Extra
const Markup = Telegraf.Markup
const markdown = Extra.markdown()

const voteTemplate = `|<b>{{date}}</b>| Players: <strong>0</strong> |

`;

export class ChatService {

    sendTeamGreeting(reply) {
        reply(`*Lets Play!*`, markdown)
    }

    sendOperationFailed(reply) {
        reply("*Ooooops*, I'm sorry, something went wrong. Try again later.", markdown)
    }

    sendTeamNotRegistered(reply) {
        reply("*Please register team!*", markdown)
    }

    sendMatchVoteMessage(reply, matchStats) {
        reply(
            Mustache.render(voteTemplate, matchStats), 
            Extra.markup(Markup.inlineKeyboard([
                [Markup.callbackButton('Yes', JSON.stringify({a:1}))]
            ]))
        )
    }

}