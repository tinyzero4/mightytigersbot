import Telegraf from "telegraf";
import shortId from "shortid";
import ejs from "ejs";
import { CONFIRMATION_TYPES, WITH_ME_TYPES } from "@configs/config";

const Extra = (Telegraf as any).Extra;
const Markup = (Telegraf as any).Markup;
const markdown = Extra.markdown();
const html = Extra.HTML();

const voteTemplate = `|<b><%=date%></b>|Players: <strong><%=total%></strong>|
<% confirmationTypes.forEach(function(type) { %>
<% let confirms = confirmationsByType[type.value] -%>
<%=type.value %><b>[<%= confirms ? confirms.length : 0 %>]</b>
<% if (confirms) { -%>
<% confirms.forEach(function(p, i) { -%>
<i><%=i + 1%>.</i> <%= players[p.pId] %> <% if (withMe[p.pId] && withMe[p.pId] > 0) { -%>(+<%=withMe[p.pId]-%>) <% } -%> <i>@<%= moment.utc(p.confirmationDate).tz("Europe/Minsk").format('DD.MM HH:mm') %></i>
<% }) -%>
<% } -%>
<% }) -%>
`;

const statsTemplate = `<b>Season appereances</b>(out of <i><%= matchesCount %></i> matches)
<% players.forEach(function(ps, i) { -%>
<i><%=i + 1%>.</i> <%= ps.name %> - <b><%= ps.appearences %></b>
<% }) -%>
`;

export class ConversationService {

  sendMatchGreeting(replyOp) {
    return replyOp(`*Go Go Go*`, markdown);
  }

  sendStats(replyOp, stats) {
    return replyOp(ejs.render(statsTemplate, stats), html);
  }

  sendMessage(replyOp, message) {
    return replyOp(message, markdown);
  }

  sendError(replyOp, message) {
    return replyOp(message || "*Ooooops*, I'm sorry, something went wrong. Try again later.", markdown);
  }

  sendNoTeamRegistered(replyOp) {
    return replyOp("*Please register team!*", markdown);
  }

  sendMatchVoteMessage(showOp, matchData) {
    return this.showVoteMessage(showOp, matchData);
  }

  updateMatchVoteMessage(editMessageTextOp, matchData) {
    return this.showVoteMessage(editMessageTextOp, matchData);
  }

  pinChatMessage(pinChatMessageOp, message_id) {
    return pinChatMessageOp(message_id).then(() => message_id);
  }

  /**
   * Used to build data required for rendering vote message along with action buttons groups.
   * Each button can send up to 64Kb of data.
   */
  private showVoteMessage(showOp, matchData) {
    const buttonData = {
      id: matchData.id
    };
    const message = ejs.render(voteTemplate, matchData);
    if (!message.trim) return Promise.resolve();
    return showOp(
      message,
      Extra.markup(Markup.inlineKeyboard([
        CONFIRMATION_TYPES.map(b => Markup.callbackButton(b.label, JSON.stringify({ ...buttonData, uid: shortId.generate(), c: b.value }))),
        WITH_ME_TYPES.map(b => Markup.callbackButton(b, JSON.stringify({ ...buttonData, uid: shortId.generate(), wm: b }))),
      ])).HTML()
    );
  }
}