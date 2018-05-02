import Telegraf from "telegraf";
import ejs from "ejs";
import { CONFIRMATION_TYPES, WITH_ME_TYPES } from "@configs/config";

const Extra = Telegraf.Extra;
const Markup = Telegraf.Markup;
const markdown = Extra.markdown();

const VOTE_TEMPLATE = `|<b><%=date%></b>| Players: <strong><%=total%></strong> |
<% confirmationTypes.forEach(function(type) { %>
<% let confirms = confirmationsByType[type.value] -%>
<%=type.value %><b>[<%= confirms ? confirms.length : 0 %>]</b>
<% if (confirms) { -%>
<% confirms.forEach(function(p, i) { -%>
<i><%=i + 1%>.</i> <%= players[p.pId] %> <% if (withMe[p.pId] && withMe[p.pId] > 0) { -%>(+<%=withMe[p.pId]-%>) <% } -%> @<%= moment(p.confimationDate).format('HH:mm:ss') %> 
<% }) -%>
<% } -%>
<% }) -%>
`;

export class ChatService {

  sendGreeting(replyOp) {
    replyOp(`*Lets Play!*`, markdown);
  }

  sendOperationFailed(replyOp) {
    replyOp("*Ooooops*, I'm sorry, something went wrong. Try again later.", markdown);
  }

  sendNoTeamRegistered(replyOp) {
    replyOp("*Please register team!*", markdown);
  }

  sendMatchVoteMessage(showOp, matchData) {
    return this.showVoteMessage(showOp, matchData);
  }

  pinChatMessage(pinChatMessageOp, message_id) {
    return pinChatMessageOp(message_id).then(() => message_id);
  }

  refreshVoteMessage(editMessageTextOp, matchData) {
    this.showVoteMessage(editMessageTextOp, matchData);
  }

  showVoteMessage(showOp, matchData) {
    const buttonData = {
      id: matchData.id,
      uid: matchData.uid,
    };
    return showOp(
      ejs.render(VOTE_TEMPLATE, matchData),
      Extra.markup(Markup.inlineKeyboard([
        CONFIRMATION_TYPES.map(b => Markup.callbackButton(b.label, JSON.stringify(Object.assign({}, buttonData, { c: b.value })))),
        WITH_ME_TYPES.map(b => Markup.callbackButton(b, JSON.stringify(Object.assign({}, buttonData, { wm: b })))),
      ])).HTML()
    );
  }
}