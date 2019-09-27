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

import {
  StatsService,
} from "@services/stats-service";

console.log(`Starting bot ${BOT_TOKEN}`);

const bot: any = new Telegraf(BOT_TOKEN);
const scheduleService = new SchedulerService();
const teamService = new TeamService(scheduleService);
const matchService = new MatchService(scheduleService, teamService);
const statsService = new StatsService(matchService);
const conversationService = new ConversationService();

bot.telegram.getMe().then((botInfo) => bot.options.username = botInfo.username);

bot.command("/nextmatch", ({ reply, replyWithHTML, replyWithMarkdown, pinChatMessage, chat }) => {
  console.log(`[nextmatch-event][${chat.id}-${chat.title}] : ${new Date()}`);
  return teamService.getTeam(chat.id)
    .then((team) => {
      console.log(`===team ${JSON.stringify(team)}`);
      return teamService.init(team, new Team(chat.title, chat.id));
    })
    .then(() => matchService.nextMatch(chat.id))
    .then(([match, created]) => {
      console.log(`===created ${created} ${JSON.stringify(match)}`);
      if (created && !!match) {
        conversationService.sendMatchVoteMessage(replyWithHTML, matchService.getMatchDetails(match))
          .then(response => conversationService.pinChatMessage(pinChatMessage, response.message_id))
          .then(message_id => message_id && matchService.linkMessageToMatch(match._id, message_id))
          .then(conversationService.sendMatchGreeting(replyWithMarkdown));
      }
    })
    .catch(err => handleError(err, "Oops, smth went wrong", reply));
});

bot.command("/seasonstats", ({ replyWithMarkdown, chat }) => {
  console.log(`[stats-event][${chat.id}-${chat.title}] : ${new Date()}`);
  return statsService.getStats(chat.id).then(stats => conversationService.sendStats(replyWithMarkdown, stats));
});

bot.command("/setschedule", ({ replyWithMarkdown, chat, message }) => {
  console.log(`[schedule-event][${chat.id}-${chat.title}] ${JSON.stringify(message.text)} : ${new Date()}`);
  return teamService.getTeam(chat.id)
    .then(team => teamService.init(team, new Team(chat.title, chat.id)))
    .then(team => teamService.setSchedule(team, message.text))
    .then(res => conversationService.sendMessage(replyWithMarkdown, res ? "*** Team schedule was updated. Run `nextmatch` to schedule new match***" : "Invalid schedule definition"))
    .then(() => matchService.cancelObsoleteMatches(chat.id))
    .catch(err => handleError(err, "Oops, smth went wrong", replyWithMarkdown));
});

bot.on("message", ({message, replyWithMarkdown}) => {
  const {from, text} = message;
  const user_mention = `[${from.username}](tg://user?id=${from.id})`;
  if (!!text) return;
  if (text.toLowerCase().trim().includes("красава")) {
    return replyWithMarkdown(`${user_mention}, красава!`);
  } else if (text.toLowerCase().trim().includes("плюсы")) {
    return replyWithMarkdown(`Нужны плюсы`);
  } else if (text.toLowerCase().trim().includes("хуй")) {
    return replyWithMarkdown(`${user_mention}, Сам ты хуй`);
  }
});

bot.on("callback_query", ({ editMessageText, callbackQuery, replyWithMarkdown }) => {
  console.log(`[confirmation event] : ${new Date()}`);
  const { id, uid, c, wm } = JSON.parse(callbackQuery.data);
  const { from } = callbackQuery;
  const confirmation: any = {
    matchId: id,
    playerId: from.id,
    playerName: (from.first_name + (from.last_name || "")) || from.username,
    confirmationId: uid,
    confirmation: c,
    withPlayer: parseInt(wm || 0),
  };

  matchService.validateConfirmation(confirmation)
    .then((valid) => {
      const user_mention = `[${from.username}](tg://user?id=${from.id})`;
      if (!valid) return replyWithMarkdown(`${user_mention},  You don't fool me!`);
      return matchService.processConfirmation(confirmation)
        .then(({ match, success, processed }) => {
          if (success && !!match) {
            return conversationService.updateMatchVoteMessage(editMessageText, matchService.getMatchDetails(match));
          } else {
            console.log(`[bot] unsucessful request ${JSON.stringify(confirmation)} status: {success:${success}, processed:${processed}, match:${match}}`);
            return Promise.resolve();
          }
        });
    });
});

const handleError = (err, msg, reply) => {
  console.error(`[bot] ${msg}. Reason: ${err}`);
  console.log(`[bot] ${msg}. Reason: ${err}`);
  return conversationService.sendError(reply, msg);
};

export {
  bot,
};