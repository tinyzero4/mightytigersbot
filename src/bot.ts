import "reflect-metadata";
import Telegraf from "telegraf";

import {
  BOT_TOKEN
} from "@configs/config";
import connection from "@db/mongo";
import {
  TeamService,
} from "@services/team-service";
import {
  MatchService,
} from "@services/match-service";
import {
  ChatService,
} from "@services/chat-service";
import {
  SchedulerService,
} from "@services/scheduler-service";

import {
  Team,
} from "@models/team";

connection.then((db) => {
  const bot = new Telegraf(BOT_TOKEN);
  const scheduleService = new SchedulerService();
  const matchService = new MatchService(db, scheduleService);
  const teamService = new TeamService(db, matchService);
  const chatService = new ChatService();

  bot.command("/newteam", ({ reply, chat }) => {
    teamService.create(new Team(chat.title, chat.id))
      .then(() => chatService.sendGreeting(reply))
      .catch(err => console.error(`[bot] issue while new team creation ${err}`));
  });

  bot.command("/nextmatch", ({ reply, replyWithHTML, pinChatMessage, chat }) => {
    teamService.findByTeamId(chat.id).then((team) => {
      if (!team) chatService.sendNoTeamRegistered(reply);
      else
        teamService.nextMatch(chat.id).then(([match, created]) => {
          if (match && created)
            chatService.sendMatchVoteMessage(replyWithHTML, matchService.matchStats(match))
              .then(data => chatService.pinChatMessage(pinChatMessage, data.message_id))
              .then(message_id => matchService.setMatchMessage(match._id, message_id))
              .catch(err => sendError(err, "Ooops, error!", reply));
        }).catch(err => sendError(err, "Oops, match scheduling error", reply));
    });
  });

  bot.on("callback_query", ({ editMessageText, callbackQuery }) => {
    const { id, uid, c, wm } = JSON.parse(callbackQuery.data);
    const { from } = callbackQuery;
    const request = {
      matchId: id,
      confirmationId: uid,
      confirmation: c,
      withMe: parseInt(wm || 0),
      pId: from.id,
      name: (from.first_name + (from.last_name || "")) || from.username,
    };
    matchService.applyConfirmation(request).then(({ match, success, processed }) => {
      if (success && match) {
        chatService.refreshVoteMessage(editMessageText, matchService.matchStats(match));
      } else {
        console.log(`[bot] unsucessful request ${JSON.stringify(request)} status: {success:${success}, processed:${processed}, match:${match}}`);
      }
    });
  });

  const sendError = (err, msg, reply) => {
    console.error(`[bot] ${msg}. Reason: ${err}`);
    chatService.sendOperationFailed(reply);
  };

  bot.startPolling();
}).catch(err => {
  console.error(`[bot] startup error ${err}`);
  process.exit(1);
});