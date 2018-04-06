#!/usr/bin/env python3
import datetime
import json
import logging
import os

import jsonpickle
from jinja2 import Environment
from pymongo import DESCENDING, ASCENDING
from telegram.ext import CommandHandler, CallbackQueryHandler
from telegram.inline.inlinekeyboardbutton import InlineKeyboardButton
from telegram.inline.inlinekeyboardmarkup import InlineKeyboardMarkup

from model import Team, Schedule, CONFIRMATIONS, WITH_ME_CONFIRMATIONS

logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

DEFAULT_MATCH_DAYS = [("1", "09:00"), ("2", "09:00"), ("3", "09:00"), ("4", "09:00"), ("5", "09:00"), ("6", "09:00")]


class GameManager:

    def __init__(self, telegram, data_repository):
        self.view = ViewHandler()
        self.repository = data_repository
        self.telegram = telegram

        telegram.dispatcher.add_handler(CommandHandler("newteam", self.new_team))
        telegram.dispatcher.add_handler(CommandHandler("nextmatch", self.next_match))
        telegram.dispatcher.add_handler(CallbackQueryHandler(self.on_confirmation))
        telegram.dispatcher.add_error_handler(GameManager.on_error)

    def start(self):
        self.telegram.start_polling(poll_interval=1, timeout=30)
        self.telegram.idle()

    def new_team(self, bot, update):
        team = self.repository.find_team(update.message.chat_id)
        if team is None:
            team = Team(update.message.chat_id, Schedule(os.environ.get('MATCH_DAYS', list(DEFAULT_MATCH_DAYS))),
                        update.message.chat.title)
            self.repository.create_team(team)
            bot.send_message(team.team_id, "*Let's Play!*", parse_mode='Markdown')
        return team

    def next_match(self, bot, update):
        team = self.repository.find_team(update.message.chat_id)
        if team is None:
            team = self.new_team(bot, update)

        (next_match, last_match, is_new) = team.next_match(self.repository.find_team_latest_match(team.team_id))
        if is_new:
            self.repository.create_match(next_match)
            self.__validate_match_date(last_match)
            ViewHandler.send_match_stats(bot, team.team_id, next_match)

    def __validate_match_date(self, match):
        if match is not None and datetime.datetime.today().date() > match.date:
            self.repository.save_match(match.complete())

    def on_confirmation(self, bot, update):
        if self.repository.is_tg_update_unprocessed(update) and update.callback_query and update.callback_query.message:
            message = update.callback_query.message

            team_id = message.chat_id
            (match_id, confirmation) = ViewHandler.parse_callback_data(update.callback_query.data)

            match = self.repository.find_match(team_id, match_id)

            self.__validate_match_date(match)

            if match is not None and not match.completed:
                player_profile = update.callback_query.from_user
                match.confirm(player_profile.full_name, player_profile.username, confirmation)

                self.repository.update_match(match)
                self.repository.save_tg_update(update.update_id, message.date)

                ViewHandler.send_match_stats(bot, message.chat_id, match, message.message_id)
        else:
            logger.warning(f"Unknown response type: {update}")

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
            return bot.send_message(chat_id=chat_id, text=ViewHandler.build_match_stats_view(match),
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


class Repository:
    def __init__(self, db):
        self._db = db
        db.confirmations.create_index("date", expireAfterSeconds=2 * 24 * 3600)
        db.matches.create_index([("team_id", ASCENDING), ("match_id", ASCENDING)])

    def create_team(self, team):
        self._db.teams.insert_one(self.__encode(team))

    def find_team(self, team_id):
        return self.__decode(self._db.teams.find_one({'_id': team_id}))

    def find_team_latest_match(self, team_id):
        return self.__decode(self._db.matches.find_one({'team_id': team_id}, sort=[('date', DESCENDING)]))

    def find_match(self, team_id, match_id):
        return self.__decode(self._db.matches.find_one({'_id': match_id, 'team_id': team_id}))

    def create_match(self, match):
        self._db.matches.replace_one(filter={'_id': match.match_id}, replacement=self.__encode(match), upsert=True)

    def update_match(self, match):
        # TODO: Replace with $set for each player confirmation
        self._db.matches.replace_one(filter={'_id': match.match_id}, replacement=self.__encode(match), upsert=True)

    def is_tg_update_unprocessed(self, update):
        return self._db.confirmations.find_one({'_id': update.update_id}) is None

    def save_tg_update(self, update_id, date):
        self._db.confirmations.insert_one({'_id': update_id, 'date': date})

    @staticmethod
    def __decode(data):
        return jsonpickle.decode(json.dumps(data)) if data is not None else None

    @staticmethod
    def __encode(data):
        return json.loads(jsonpickle.encode(data))


def main():
    # token = os.environ.get('TG_BOT_TOKEN')
    # if not token:
    #     raise ValueError('Telegram Bot token is not specified')
    # client = MongoClient(os.environ.get('TG_MONGO_URI', 'mongodb://127.0.0.1/tigers'))
    # if not client:
    #     raise ValueError('Mongo URI is not specified')
    #
    # GameManager(Updater(token), Repository(client.tigers)).start()
    print(Schedule.parse_schedule("1;09:00|4;09:00"))


if __name__ == '__main__':
    main()
