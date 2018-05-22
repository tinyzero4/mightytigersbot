import "reflect-metadata";
import Telegraf from "telegraf";
// import { connection } from "@db/mongo";

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

const bot = new Telegraf(BOT_TOKEN);
const scheduleService = new SchedulerService();
const teamService = new TeamService();
const matchService = new MatchService(scheduleService, teamService);
const conversionService = new ConversationService();

bot.options = {};

bot.command("/newteam", ({ reply, chat }) => {
  return teamService.create(new Team(chat.title, chat.id))
    .then(() => conversionService.sendGreeting(reply))
    .then(() => onComplete())
    .catch(err => console.error(`[bot] issue while new team creation ${err}`));
});

bot.command("/nextmatch", ({ reply, replyWithHTML, pinChatMessage, chat }) => {
  return teamService.findByTeamId(chat.id)
    .then((team) => {
      if (!team) {
        return conversionService.sendNoTeamRegistered(reply);
      } else {
        return matchService.nextMatch(chat.id)
          .then(([match, created]) => {
            if (created && !!match) {
              conversionService.sendMatchVoteMessage(replyWithHTML, matchService.getMatchDetails(match))
                .then(response => conversionService.pinChatMessage(pinChatMessage, response.message_id))
                .then(message_id => matchService.linkMessageToMatch(match._id, message_id))
                .catch(err => sendError(err, "Ooops, error!", reply));
            }
          }).catch(err => sendError(err, "Oops, match scheduling error", reply));
      }
    })
    .then(() => onComplete());
});

bot.on("callback_query", ({ editMessageText, callbackQuery }) => {
  const { id, uid, c, wm } = JSON.parse(callbackQuery.data);
  const { from } = callbackQuery;
  const confirmRequest = {
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
        return conversionService.updateMatchVoteMessage(editMessageText, matchService.getMatchDetails(match));
      } else {
        console.log(`[bot] unsucessful request ${JSON.stringify(confirmRequest)} status: {success:${success}, processed:${processed}, match:${match}}`);
        return Promise.resolve();
      }
    })
    .then(() => onComplete());
});

const onComplete = () => {
  return !!bot.options.shutdownOnCompletion ? shutdown() : Promise.resolve();
};

const shutdown = () => {
  // connection.then(c => c.close());
};

const sendError = (err, msg, reply) => {
  console.error(`[bot] ${msg}. Reason: ${err}`);
  conversionService.sendError(reply);
};

export {
  bot,
};