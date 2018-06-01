import "reflect-metadata";
import Telegraf from "telegraf";

import {
  BOT_TOKEN,
} from "@configs/config";

import {
  TeamService,
} from "@services/team-service";

import {
  MatchService,
} from "@services/match-service";

import {
  ConversationService,
} from "@services/conversation-service";

import {
  SchedulerService,
} from "@services/scheduler-service";

import {
  Team,
} from "@models/team";

console.log(`Starting bot ${BOT_TOKEN}`);

const bot:any = new Telegraf(BOT_TOKEN);
const scheduleService = new SchedulerService();
const teamService = new TeamService();
const matchService = new MatchService(scheduleService, teamService);
const conversationService = new ConversationService();

bot.telegram.getMe().then((botInfo) => bot.options.username = botInfo.username)

bot.command("/newteam", ({ reply, chat }) => {
  console.log(`[newteam] : ${new Date()}`);
  return teamService.create(new Team(chat.title, chat.id))
    .then(() => conversationService.sendGreeting(reply))
    .catch(err => handleError(err, "*Team has been already registered*", reply));
});

bot.command("/nextmatch", ({ reply, replyWithHTML, pinChatMessage, chat }) => {
  console.log(`[nextmatch] : ${new Date()}`);
  return teamService.findByTeamId(chat.id)
    .then((team) => {
      if (!team) {
        return conversationService.sendNoTeamRegistered(reply);
      } else {
        return matchService.nextMatch(chat.id)
          .then(([match, created]) => {
            if (created && !!match) {
              conversationService.sendMatchVoteMessage(replyWithHTML, matchService.getMatchDetails(match))
                .then(response => conversationService.pinChatMessage(pinChatMessage, response.message_id))
                .then(message_id => matchService.linkMessageToMatch(match._id, message_id))
                .catch(err => handleError(err, "Ooops, error!", reply));
            }
          }).catch(err => handleError(err, "Oops, match scheduling error", reply));
      }
    });
});

bot.on("callback_query", ({ editMessageText, callbackQuery }) => {
  const { id, uid, c, wm } = JSON.parse(callbackQuery.data);
  const { from } = callbackQuery;
  const confirmRequest: any = {
    matchId: id,
    playerId: from.id,
    playerName: (from.first_name + (from.last_name || "")) || from.username,
    confirmationId: uid,
    confirmation: c,
    withPlayer: parseInt(wm || 0),
  };
  return matchService.processConfirmation(confirmRequest)
    .then(({ match, success, processed }) => {
      if (success && !!match) {
        return conversationService.updateMatchVoteMessage(editMessageText, matchService.getMatchDetails(match));
      } else {
        console.log(`[bot] unsucessful request ${JSON.stringify(confirmRequest)} status: {success:${success}, processed:${processed}, match:${match}}`);
        return Promise.resolve();
      }
    });
});

const handleError = (err, msg, reply) => {
  console.error(`[bot] ${msg}. Reason: ${err}`);
  return conversationService.sendError(reply, msg);
};

export {
  bot,
};