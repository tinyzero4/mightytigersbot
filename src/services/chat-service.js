const Telegraf = require("telegraf")
const ejs = require("ejs")
import { CONFIRMATIONS, CONFIRMATIONS_WITH_ME } from "../config"

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

    sendTeamGreeting(reply) {
        reply(`*Lets Play!*`, markdown)
    }

    sendOperationFailed(reply) {
        reply("*Ooooops*, I'm sorry, something went wrong. Try again later.", markdown)
    }

    sendTeamNotRegistered(reply) {
        reply("*Please register team!*", markdown)
    }

    sendMatchVoteMessage(show, pinChatMessage, matchData) {
        return this.showVoteMessage(show, matchData).then(data => {
            pinChatMessage(data.message_id)
            return data;
        });
    }

    updateMatchVoteMessage(editMessageText, matchData) {
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
                CONFIRMATIONS.map(b => Markup.callbackButton(b.btn, JSON.stringify(Object.assign({}, buttonData, { c: b.v })))),
                CONFIRMATIONS_WITH_ME.map(b => Markup.callbackButton(b, JSON.stringify(Object.assign({}, buttonData, { wm: b })))),
            ])).HTML()
        )
    }
}