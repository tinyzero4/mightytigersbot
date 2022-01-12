import "reflect-metadata";
import Telegraf from "telegraf";
import { BOT_TOKEN } from "@configs/config";
import { TeamService } from "@services/team-service";
import { MatchService } from "@services/match-service";
import ConversationService from "@services/conversation-service";
import { SchedulerService } from "@services/scheduler-service";
import { Team } from "@models/team";
import { StatsService } from "@services/stats-service";

const bot: any = new Telegraf(BOT_TOKEN);
const scheduleService = new SchedulerService();
const teamService = new TeamService(scheduleService);
const matchService = new MatchService(scheduleService, teamService);
const statsService = new StatsService(matchService);
const conversationService = new ConversationService();

bot.telegram.getMe().then((botInfo) => bot.options.username = botInfo.username);

(async () => {
  teamService.init();
  matchService.init();
})().catch(err => {
  console.error(err);
});

bot.command("/nextmatch", async ({reply, replyWithHTML, replyWithMarkdown, pinChatMessage, chat}) => {

    console.log(`[nextmatch-event][${chat.id}-${chat.title}] : ${new Date()}`);

    try {
        const team = await teamService.resolveTeam(new Team(chat.title, chat.id));
        const [match, newMatch] = await matchService.nextMatch(team.team_id);
        if (newMatch) {
            const matchData = matchService.getMatchDetails(match);
            const message = await conversationService.sendMatchVoteMessage(replyWithHTML, matchData);
            await conversationService.pinChatMessage(pinChatMessage, message.message_id);
            const success = await matchService.linkMessageToMatch(match._id, message.message_id);
            if (!!success) ConversationService.sendMatchGreeting(replyWithMarkdown);
        }
    } catch (e) {
        onError(e, "Oops, smth went wrong", reply);
    }
});

bot.command("/seasonstats", async ({replyWithMarkdown, chat}) => {
    console.log(`[stats-event][${chat.id}-${chat.title}] : ${new Date()}`);
    const team = await teamService.getTeam(chat.id);
    return statsService.getStats(team)
        .then(stats => ConversationService.sendStats(replyWithMarkdown, stats));
});

bot.command("/setschedule", async ({replyWithMarkdown, chat, message}) => {
    console.log(`[schedule-event][${chat.id}-${chat.title}] ${JSON.stringify(message.text)} : ${new Date()}`);
    try {
        const team = await teamService.resolveTeam(new Team(chat.title, chat.id));
        const ok = await teamService.setSchedule(team, message.text);
        if (ok) {
            await matchService.cancelObsoleteMatches(team.team_id);
            await ConversationService.sendMessage(replyWithMarkdown, "*** Team schedule was updated. Run `nextmatch` to schedule new match***");
        } else {
            await ConversationService.sendMessage(replyWithMarkdown, "Invalid schedule definition");
        }
    } catch (e) {
        onError(e, "Oops, smth went wrong", replyWithMarkdown);
    }
});

bot.on("message", ({message, replyWithMarkdown}) => {
    const {from, text} = message;
    const mention = buildTgMention(from);
    if (!text) return;
    const userMessage = (text || "").toString().toLowerCase().trim();
    if (userMessage.includes("красава")) {
        return replyWithMarkdown(`${mention}, красава!`);
    } else if (userMessage.includes("плюсы")) {
        return replyWithMarkdown(`Нужны плюсы`);
    } else if (userMessage.includes("хуй")) {
        return replyWithMarkdown(`${mention}, Сам ты хуй`);
    }
});

bot.on("callback_query", async ({editMessageText, callbackQuery, replyWithMarkdown}) => {
    console.log(`[confirmation-event] : ${new Date()} ${callbackQuery.from.username}`);
    const {id, uid, c, wm} = JSON.parse(callbackQuery.data);
    const {from} = callbackQuery;

    const confirmation: any = {
        matchId: id,
        playerId: from.id,
        playerName: buildUserName(from),
        confirmationId: uid,
        confirmation: c,
        withPlayer: parseInt(wm || 0),
    };

    try {
        const ok = await matchService.validateConfirmation(confirmation);
        if (!ok) return replyWithMarkdown(`${buildTgMention(from)},  You don't fool me!`);
        const {match, success, processed} = await matchService.processConfirmation(confirmation);
        if (match && success) {
            return conversationService.updateMatchVoteMessage(editMessageText, matchService.getMatchDetails(match));
        } else {
            console.log(`[bot] unsuccessful request ${JSON.stringify(confirmation)} status: {success:${success}, processed:${processed}, match:${match}}`);
        }
    } catch (e) {
        console.error(`[error] ${e}`);
    }
});

const buildTgMention = (u) => {
    return `[${buildUserName(u)}](tg://user?id=${u.id})`;
};

const buildUserName = (u) => {
    return `${(u.first_name + (u.last_name || "")) || u.username}`;
};

const onError = (err, msg, reply) => {
    console.error(`[bot] ${msg}. Reason: ${err}`);
    return ConversationService.sendError(reply, msg);
};

console.log(`Bot [${BOT_TOKEN}] started`);

export default bot;
