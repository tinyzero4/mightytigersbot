import Telegraf from "telegraf";
import ejs from "ejs";
import { CONFIRMATION_TYPES, WITH_ME_TYPES } from "@configs/config";

const Extra = (Telegraf as any).Extra;
const Markup = (Telegraf as any).Markup;
const markdown = Extra.markdown();

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

export class ConversationService {

  sendGreeting(replyOp) {
    return replyOp(`*Lets Play!*`, markdown);
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
      id: matchData.id,
      uid: matchData.uid,
    };
    return showOp(
      ejs.render(voteTemplate, matchData),
      Extra.markup(Markup.inlineKeyboard([
        CONFIRMATION_TYPES.map(b => Markup.callbackButton(b.label, JSON.stringify({ ...buttonData, c: b.value }))),
        WITH_ME_TYPES.map(b => Markup.callbackButton(b, JSON.stringify({ ...buttonData, wm: b }))),
      ])).HTML()
    );
  }
}