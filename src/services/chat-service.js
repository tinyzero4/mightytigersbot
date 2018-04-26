const Telegraf = require("telegraf")
const Mustache = require("mustache")
import {CONFIRMATIONS, CONFIRMATIONS_WITH_ME} from "../config" 

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

    sendMatchVoteMessage(reply, pinChatMessage, matchData) {
        const buttonData = {
            id: matchData.id,
            uid: matchData.uid
        }
        return reply(
            Mustache.render(voteTemplate, matchData), 
            Extra.markup(Markup.inlineKeyboard([
                CONFIRMATIONS.map(b => Markup.callbackButton(b.btn, JSON.stringify(Object.assign({}, buttonData, {c:b.v})))),
                CONFIRMATIONS_WITH_ME.map(b => Markup.callbackButton(b, JSON.stringify(Object.assign({}, buttonData, {wm:b})))),
            ]))).then(data => {
                pinChatMessage(data.message_id)
                return data;
            });
    }

    updateMatchVoteMessage(editMessageText, matchData) {
        console.log(`[chat-service] ${JSON.stringify(match)}`)
    }
}