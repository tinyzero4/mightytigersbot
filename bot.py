#!/usr/bin/env python3
import datetime
import json
import logging
import os

import jsonpickle
from jinja2 import Environment
from pymongo import MongoClient, DESCENDING, ASCENDING
from telegram.ext import Updater, CommandHandler, CallbackQueryHandler
from telegram.inline.inlinekeyboardbutton import InlineKeyboardButton
from telegram.inline.inlinekeyboardmarkup import InlineKeyboardMarkup

logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

CONFIRMATIONS = ['⚽', '💩', '🤔']
WITH_ME_CONFIRMATIONS = ['+1', '-1']

DEFAULT_MATCH_DAYS = [1, 4]

BOT_COMMAND_NEW_TEAM = 'newteam'
BOT_COMMAND_NEXT_MATCH = 'nextmatch'


class Player:
    def __init__(self, name, username):
        self.name = name
        self.username = username
        self.confirmation = '🤔'
        self.with_me = 0

    def confirm(self, value):
        self.confirmation = value

    def confirm_with_me(self, value):
        try:
            self.with_me += int(value)
            if self.with_me < 0:
                self.with_me = 0
        except ValueError:
            logger.error(f"Unable to apply confirmation '{value}' for '{self.name}' player")

    def __repr__(self):
        return f"name:{self.name}|confirmation:{self.confirmation}|with_me:{self.with_me}"


class Match:
    def __init__(self, date, team_id):
        self._id = None
        self.date = date
        self.team_id = team_id
        self.squad = {}
        self.completed = False

    @property
    def match_id(self):
        return self._id

    def complete(self):
        self.completed = True
        return self

    def confirm(self, name, username, value):
        if username not in self.squad:
            self.squad[username] = Player(name, username)

        player = self.squad[username]

        if value in CONFIRMATIONS:
            player.confirm(value)
        elif value in WITH_ME_CONFIRMATIONS:
            player.confirm_with_me(value)

    def stats(self):
        stats = {'total': {}}

        for c in CONFIRMATIONS:
            stats[c] = list(filter(lambda p: p.confirmation == c, self.squad.values()))

        stats['total']['voted'] = sum(map(lambda v: len(v), stats.values()))
        stats['total']['with_me'] = sum(list(filter(
            lambda v: v > 0, map(lambda p: p.with_me, self.squad.values()))))
        stats['total']['all'] = stats['total']['with_me'] + len(stats[CONFIRMATIONS[0]])
        return stats

    def __repr__(self):
        return f"date:{self.date.strftime('%Y-%m-%d')}|squad:{self.squad}"


class Schedule:

    def __init__(self, weekdays):
        if not weekdays:
            raise ValueError(f"At least one day on week should be marked as match day")
        self.week_days = weekdays

    def next_match_date(self):
        now = datetime.datetime.today()
        week_day = now.isoweekday()

        match_days_on_current_week = list(filter(lambda d: d > week_day, self.week_days))

        if not match_days_on_current_week:
            days_until_next_match = 7 - now.isoweekday() + self.week_days[0]
        else:
            days_until_next_match = match_days_on_current_week[0] - now.isoweekday()
        return (now + datetime.timedelta(days=days_until_next_match)).date()


class Team:
    def __init__(self, team_id, schedule, name='MightyTigers'):
        self._id = team_id
        self.name = name
        self.schedule = schedule

    @property
    def team_id(self):
        return self._id

    def next_match(self, latest_match):
        next_match_date = self.schedule.next_match_date()

        if not latest_match or latest_match.date < next_match_date:
            return Match(next_match_date, self.team_id), latest_match
        return latest_match, None

    def __repr__(self):
        return f"name:{self.name}|teamId:{self.team_id}|schedule:{self.schedule}"


class GameManager:

    def __init__(self, tg, db):
        tg.dispatcher.add_handler(CommandHandler(BOT_COMMAND_NEW_TEAM, self.new_team))
        tg.dispatcher.add_handler(CommandHandler(BOT_COMMAND_NEXT_MATCH, self.next_match))
        tg.dispatcher.add_handler(CallbackQueryHandler(self.on_confirmation))
        tg.dispatcher.add_error_handler(GameManager.on_error)

        self.view = ViewHandler()
        self._db = db
        self._tg = tg

    def start(self):
        self._tg.start_polling(poll_interval=1, timeout=30)
        self._tg.idle()

    def new_team(self, bot, update):
        team = self.find_team(update.message.chat_id)
        if team is None:
            team = Team(update.message.chat_id, Schedule(os.environ.get('MATCH_DAYS', list(DEFAULT_MATCH_DAYS))),
                        update.message.chat.title)
            self.save_team(team)
            bot.send_message(team.team_id, "*Let's Play!*", parse_mode='Markdown')
        return team

    def next_match(self, bot, update):
        team = self.find_team(update.message.chat_id)
        if team is None:
            team = self.new_team(bot, update)

        (next_match, last_match) = team.next_match(self.find_team_latest_match(team.team_id))
        if last_match:
            self.save_match(next_match)
            self.save_match(last_match.complete())
            ViewHandler.send_match_stats(bot, team.team_id, next_match)

    def on_confirmation(self, bot, update):
        if self.__is_unprocessed_update(update) and update.callback_query and update.callback_query.message:
            message = update.callback_query.message

            team_id = message.chat_id
            (match_id, confirmation) = ViewHandler.parse_callback_data(update.callback_query.data)

            match = self.find_match(team_id, match_id)
            if match is not None:
                player_profile = update.callback_query.from_user
                match.confirm(player_profile.full_name, player_profile.username, confirmation)

                self.save_match(match)
                self.__store_update(update.update_id, message.date)

                ViewHandler.send_match_stats(bot, message.chat_id, match, message.message_id)
        else:
            logger.warning(f"Unknown response type: {update}")

    def save_team(self, team):
        self._db.teams.insert_one(self.__encode(team))

    def find_team(self, team_id):
        return self.__decode(self._db.teams.find_one({'_id': team_id}))

    def find_team_latest_match(self, team_id):
        return self.__decode(self._db.matches.find_one({'team_id': team_id})).sort([{'date', DESCENDING}])

    def find_match(self, team_id, match_id):
        return self.__decode(self._db.matches.find_one({'match_id': match_id, 'team_id': team_id}))

    # TODO: $set by each player confirmation
    def save_match(self, match):
        self._db.matches.update_one(filter={'_id': match.team_id}, update=self.__encode(match), upsert=True)

    def __is_unprocessed_update(self, update):
        return self._db.confirmations.find_one({'_id': update.update_id}) is None

    def __store_update(self, update_id, date):
        self._db.confirmations.insert_one({'_id': update_id, 'date': date})

    @staticmethod
    def __decode(data):
        return jsonpickle.decode(json.dumps(data)) if data is not None else None

    @staticmethod
    def __encode(data):
        return json.loads(jsonpickle.encode(data))

    @staticmethod
    def on_error(bot, update, error):
        logger.warning('Update "%s" caused error "%s"', update, error)


class ViewHandler:
    captions = {CONFIRMATIONS[0]: "[PLAY]", CONFIRMATIONS[1]: "[REJECT]"}

    match_stats_view = """
| <b>{{date}}</b> | Players - <b>{{stats['total']['all']}}</b> |
{% for c in confirmations %}
<b>{{c}}[{{stats[c]|length}}]</b>:
{% for t in stats[c] %}  <i>{{loop.index}}.{{t.name}} {% if t.with_me>0 %}(+{{t.with_me}}){% endif %}</i>{% endfor %}
{% endfor %}
"""
    _stats_template = Environment().from_string(match_stats_view)

    @staticmethod
    def send_match_stats(bot, chat_id, match, message_id=None):
        keyboard = [
            ViewHandler.pack_buttons(CONFIRMATIONS, [match.match_id]),
            ViewHandler.pack_buttons(WITH_ME_CONFIRMATIONS, [match.match_id])
        ]
        if not message_id:
            return bot.send_message(chat_id=chat_id, message=ViewHandler.build_match_stats_view(match),
                                    caption="caption", parse_mode='html', reply_markup=InlineKeyboardMarkup(keyboard),
                                    timeout=5000)
        else:
            return bot.edit_message_text(chat_id=chat_id, text=ViewHandler.build_match_stats_view(match),
                                         message_id=message_id, parse_mode='html',
                                         reply_markup=InlineKeyboardMarkup(keyboard), timeout=5000)

    @staticmethod
    def build_match_stats_view(match):
        return ViewHandler._stats_template.render(date=match.date, stats=match.stats(),
                                                  confirmations=CONFIRMATIONS,
                                                  button_caption=ViewHandler.captions)

    @staticmethod
    def pack_buttons(types, data):
        return list(
            map(lambda t: InlineKeyboardButton(f"{t}{ViewHandler.captions.get(t, '')}",
                                               callback_data=ViewHandler.pack_callback_data(data + [t])), types)
        )

    @staticmethod
    def parse_callback_data(data):
        return data.split(";")

    @staticmethod
    def pack_callback_data(data):
        return ";".join(data)


def main():
    token = os.environ.get('TG_BOT_TOKEN')
    if not token:
        raise ValueError('Telegram Bot token is not specified')
    client = MongoClient(os.environ.get('TG_MONGO_URI', 'mongodb://127.0.0.1/tigers'))
    if not client:
        raise ValueError('Mongo URI is not specified')

    client.tigers.confirmations.create_index("date", expireAfterSeconds=2 * 24 * 3600)
    client.tigers.matches.create_index([("team_id", ASCENDING), ("match_id", ASCENDING)])

    GameManager(Updater(token), client.tigers).start()


if __name__ == '__main__':
    main()
