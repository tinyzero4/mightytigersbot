#!/usr/bin/env python3

import datetime
import logging
from uuid import uuid4

from jinja2 import Environment
from telegram.ext import Updater, CommandHandler, CallbackQueryHandler
from telegram.inline.inlinekeyboardbutton import InlineKeyboardButton
from telegram.inline.inlinekeyboardmarkup import InlineKeyboardMarkup

logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

match_stats = """
<b>Registration</b> is opened for <b>{{match.date}}</b>
<i>Squad</i>: Total Going - <b>{{stats['total']}}</b> | Voted - <b>{{ stats['+']|length + stats['-']|length }}</b><a href="https://shop.savethechildren.org.uk/wp-content/uploads/2016/10/football-1.png">&#8205;</a>

<b>Going [{{ stats['+']|length }}]</b>:
{% for t in stats['+'] %}
    <i>{{loop.index}}. {{t.name}} {% if t.add_on > 0 %}(+{{t.add_on}}){% endif %}</i>
{% endfor %}
<b>NOT Going [{{ stats['-']|length }}]</b>:
{% for t in stats['-'] %}
    <i>{{loop.index}}. {{t.name}} {% if t.add_on > 0 %}(+{{t.add_on}}){% endif %}</i>
{% endfor %}
"""


class MatchPlayer:
    confirmation_types = ['+', '-']
    add_on_types = ['+1', '-1']

    def __init__(self, name, username):
        self.name = name
        self.username = username
        self.confirmation = None
        self.add_on = 0

    def __repr__(self):
        return f"{self.name} aka {self.username} confirmation: self {self.confirmation}, add-ons {self.add_on}"


class Match:
    def __init__(self, date):
        self.id = uuid4()
        self.date = date
        self.squad = {}

    def apply_confirmation(self, name, username, confirmation):
        if username not in self.squad:
            self.squad[username] = MatchPlayer(name, username)

        if confirmation in MatchPlayer.confirmation_types:
            self.squad[username].confirmation = confirmation
        elif confirmation in MatchPlayer.add_on_types:
            try:
                self.squad[username].add_on += int(confirmation)
                if self.squad[username].add_on < 0:
                    self.squad[username].add_on = 0
            except ValueError:
                logger.error(f"Unable to apply confirmation '{confirmation}' for {username} player")

    def stats(self):
        stats = {}
        for t in MatchPlayer.confirmation_types:
            stats[t] = list(filter(lambda p: p.confirmation == t, self.squad.values()))

        stats['total_add_on'] = sum(list(filter(lambda v: v > 0, map(lambda p: p.add_on, self.squad.values()))))
        stats['total'] = stats['total_add_on'] + len(stats[MatchPlayer.confirmation_types[0]])
        return stats

    def __repr__(self):
        return f"Match {self.id} is on {self.date.strftime('%Y-%m-%d')}!. \n Squad: {self.squad}"


class Schedule:

    def __init__(self, match_weekdays=list([1, 4])):
        self.match_weekdays = match_weekdays

    def next_match_on(self):
        now = datetime.datetime.today()
        next_match_days_on_week = list(filter(lambda d: d > now.isoweekday(), self.match_weekdays))
        if not next_match_days_on_week:
            days_delta = 7 - now.isoweekday() + self.match_weekdays[0]
        else:
            days_delta = next_match_days_on_week[0] - now.isoweekday()
        return (now + datetime.timedelta(days=days_delta)).date()


class Team:
    def __init__(self, team_id, name='MightyTigers', schedule=Schedule()):
        self.id = team_id
        self.name = name
        self.schedule = schedule
        self.match = None

    def next_match(self):
        next_match_date = self.schedule.next_match_on()
        new_match = False
        if not self.match or self.match.date < next_match_date:
            self.match = Match(next_match_date)
            new_match = True
        return self.match, new_match

    def __str__(self):
        return f"Who we are? The {self.name} !"

    def __repr__(self):
        return f"{self.name} : {self.match}"


class GameManager:
    stats_template = Environment().from_string(match_stats)

    def __init__(self, tg):
        tg.dispatcher.add_handler(CommandHandler("newteam", self.register_team))
        tg.dispatcher.add_handler(CommandHandler("nextmatch", self.next_match))
        tg.dispatcher.add_handler(CallbackQueryHandler(self.process_confirmation))
        tg.dispatcher.add_error_handler(on_error)
        self.__tg = tg
        self.__teams = {}

    def start(self):
        self.__tg.start_polling(poll_interval=1, timeout=30)
        self.__tg.idle()

    def next_match(self, bot, update):
        chat_id = update.message.chat_id
        if chat_id not in self.__teams:
            self.register_team(bot, update)

        team = self.__teams[chat_id]
        match = team.next_match()

        if match[1]:
            self.show_match_stats(bot, chat_id, match[0])

    def process_confirmation(self, bot, update):
        if update.callback_query:
            message = update.callback_query.message
            player_profile = update.callback_query.from_user
            if message and message.chat_id in self.__teams:
                match = self.__teams[update.callback_query.message.chat_id].match
                match.apply_confirmation(
                    player_profile.full_name, player_profile.username, update.callback_query.data
                )
                self.show_match_stats(bot, update.callback_query.message.chat_id, match, message.message_id)
            logger.info(self.__teams)
        else:
            logger.warning(f"Unknown response type: {update}")

    @staticmethod
    def show_match_stats(bot, chat_id, match, message_id=None):
        keyboard = [
            GameManager.pack_vote_buttons(MatchPlayer.confirmation_types),
            GameManager.pack_vote_buttons(MatchPlayer.add_on_types),
        ]
        if not message_id:
            bot.send_message(chat_id, GameManager.match_stats_str(match), parse_mode='html',
                             reply_markup=InlineKeyboardMarkup(keyboard))
        else:
            bot.edit_message_text(GameManager.match_stats_str(match), chat_id, message_id, parse_mode='html',
                                  reply_markup=InlineKeyboardMarkup(keyboard))

    @staticmethod
    def match_stats_str(match):
        return GameManager.stats_template.render(match=match, stats=match.stats())

    @staticmethod
    def pack_vote_buttons(types):
        return list(map(lambda t: InlineKeyboardButton(t, callback_data=f"{t}"), types))

    def register_team(self, bot, update):
        chat_id = update.message.chat_id
        if update.message.chat_id not in self.__teams:
            self.__teams[chat_id] = Team(chat_id, name=update.message.chat.title)
            bot.send_message(chat_id, "*Let's Play!*", parse_mode='Markdown')


def on_error(bot, update, error):
    logger.warning('Update "%s" caused error "%s"', update, error)


def main():
    tg_bot_token = "484897521:AAFnBejLGKBEP1vPT1-XakPV6-lpTghZBRM"
    GameManager(Updater(tg_bot_token)).start()


if __name__ == '__main__':
    main()
