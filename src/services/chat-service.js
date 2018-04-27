import Telegraf from "telegraf";
import ejs from "ejs"
import { CONFIRMATION_TYPES, CONFIRMATION_WITH_ME_TYPES } from "@configs/config"

const Extra = Telegraf.Extra
const Markup = Telegraf.Markup
const markdown = Extra.markdown()

const VOTE_TEMPLATE = `|<b><%=date%></b>| Players: <strong><%=total%></strong> |
<% confirmationTypes.forEach(function(type) { %>
    <% let confirms = confirmationsByType[type.v] %>
<%= type.v %><b>[<%= confirms ? confirms.length : 0 %>]</b>
        <% if (confirms) { %>
            <% confirms.forEach(function(p, i) { %>
<i><%=i + 1%></i> <%= players[p.pId] %> <%= p.confimationDate %>
            <% }) %>
        <% } %>
<% }) %>
`;

export class ChatService {

    sendGreeting(reply) {
        reply(`*Lets Play!*`, markdown)
    }

    sendOperationFailed(reply) {
        reply("*Ooooops*, I'm sorry, something went wrong. Try again later.", markdown)
    }

    sendNoTeamRegistered(reply) {
        reply("*Please register team!*", markdown)
    }

    sendMatchVoteMessage(show, matchData) {
        return this.showVoteMessage(show, matchData);
    }

    pinChatMessage(pinChatMessage, message_id) {
        return pinChatMessage(message_id).then(() => message_id);
    }

    refreshVoteMessage(editMessageText, matchData) {
        this.showVoteMessage(editMessageText, matchData)
    }

    showVoteMessage(show, matchData) {
        const buttonData = {
            id: matchData.id,
            uid: matchData.uid
        }
        return show(
            ejs.render(VOTE_TEMPLATE, matchData),
            Extra.markup(Markup.inlineKeyboard([
                CONFIRMATION_TYPES.map(b => Markup.callbackButton(b.label, JSON.stringify(Object.assign({}, buttonData, { c: b.value })))),
                CONFIRMATION_WITH_ME_TYPES.map(b => Markup.callbackButton(b, JSON.stringify(Object.assign({}, buttonData, { wm: b })))),
            ])).HTML()
        )
    }
}