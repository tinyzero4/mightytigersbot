#!/usr/bin/env python3
import datetime
import logging
import os

from jinja2 import Environment
from telegram.ext import Updater, CommandHandler, CallbackQueryHandler
from telegram.inline.inlinekeyboardbutton import InlineKeyboardButton
from telegram.inline.inlinekeyboardmarkup import InlineKeyboardMarkup

logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

_confirmations = ['+', '-']
_with_me_confirmations = ['+1', '-1']

DEFAULT_MATCH_DAYS = [1, 4]

BOT_COMMAND_NEW_TEAM = 'newteam'
BOT_COMMAND_NEXT_MATCH = 'nextmatch'

PARSE_MODE_MD = 'Markdown'
PARSE_MODE_HTML = 'Html'

BUTTON_CAPTION = {
    '+': "\u26BD[Y]",
    '-': '💩[N]',
}


class Player:
    def __init__(self, name, username):
        self.name = name
        self.username = username
        self.confirmation = None
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
        return f"{self.name}|going:{self.confirmation}|with_addition:{self.with_me}"


class Match:
    def __init__(self, date):
        self.date = date
        self.squad = {}

    def confirm(self, name, username, value):
        if not username in self.squad:
            self.squad[username] = Player(name, username)

        player = self.squad[username]

        if value in _confirmations:
            player.confirm(value)
        elif value in _with_me_confirmations:
            player.confirm_with_me(value)

    def stats(self):
        stats = {'total': {}}

        for c in _confirmations:
            stats[c] = list(filter(lambda p: p.confirmation == c, self.squad.values()))

        stats['total']['voted'] = sum(map(lambda v: len(v), stats.values()))
        stats['total']['with_me'] = sum(list(filter(
            lambda v: v > 0, map(lambda p: p.with_me, self.squad.values()))))
        stats['total']['all'] = stats['total']['with_me'] + len(stats[_confirmations[0]])
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
    def __init__(self, schedule, name='MightyTigers'):
        self.name = name
        self.schedule = schedule
        self.match = None

    def next_match(self):
        next_match_date = self.schedule.next_match_date()

        if not self.match or self.match.date < next_match_date:
            self.match = Match(next_match_date)
            return self.match, True
        return self.match, False

    def __str__(self):
        return f"Who we are? The {self.name} !"

    def __repr__(self):
        return f"{self.name}|Current match:{self.match}"


class GameManager:

    def __init__(self, tg):
        tg.dispatcher.add_handler(CommandHandler(BOT_COMMAND_NEW_TEAM, self.new_team))
        tg.dispatcher.add_handler(CommandHandler(BOT_COMMAND_NEXT_MATCH, self.next_match))
        tg.dispatcher.add_handler(CallbackQueryHandler(self.on_confirmation))
        tg.dispatcher.add_error_handler(GameManager.on_error)
        self.teams = {}
        self.__tg = tg
        self.view = MatchConfirmationView()

    def start(self):
        self.__tg.start_polling(poll_interval=1, timeout=30)
        self.__tg.idle()

    def new_team(self, bot, update):
        chat_id = update.message.chat_id
        if update.message.chat_id not in self.teams:
            schedule = Schedule(os.environ.get('MATCH_DAYS', list(DEFAULT_MATCH_DAYS)))
            self.teams[chat_id] = Team(schedule, update.message.chat.title)
            bot.send_message(chat_id, "*Let's Play!*", parse_mode=PARSE_MODE_MD)

    def next_match(self, bot, update):
        chat_id = update.message.chat_id
        if chat_id not in self.teams:
            self.new_team(bot, update)

        (match, is_new) = self.teams[chat_id].next_match()
        if is_new:
            self.show_match_stats(bot, chat_id, match)

    def on_confirmation(self, bot, update):
        if update.callback_query and update.callback_query.message:
            message = update.callback_query.message
            if message.chat_id in self.teams:
                player_profile = update.callback_query.from_user
                team = self.teams[message.chat_id]
                team.match.confirm(player_profile.full_name, player_profile.username, update.callback_query.data)
                self.show_match_stats(bot, message.chat_id, team.match, message.message_id)
        else:
            logger.warning(f"Unknown response type: {update}")

    @staticmethod
    def show_match_stats(bot, chat_id, match, message_id=None):
        keyboard = [MatchConfirmationView.pack_buttons(_confirmations + _with_me_confirmations)]
        if not message_id:
            bot.send_message(chat_id, MatchConfirmationView.build_match_stats_view(match), caption="caption",
                             parse_mode=PARSE_MODE_HTML, reply_markup=InlineKeyboardMarkup(keyboard))
        else:
            bot.edit_message_text(MatchConfirmationView.build_match_stats_view(match), chat_id, message_id,
                                  parse_mode=PARSE_MODE_HTML, reply_markup=InlineKeyboardMarkup(keyboard))

    @staticmethod
    def on_error(bot, update, error):
        logger.warning('Update "%s" caused error "%s"', update, error)


class MatchConfirmationView:
    match_stats_view = """
<b>Registration</b> for <b>{{match.date}}</b>| Total Going - <b>{{stats['total']['all']}}</b> | Voted - <b>{{stats['total']['voted']}}</b>
<i>Squad</i>:
<b>Going [{{stats['+']|length}}]</b>:
{% for t in stats['+'] %}
    <i>{{loop.index}}.{{t.name}} {% if t.with_me>0 %}(+{{t.with_me}}){% endif %}</i>
{% endfor %}
<b>NOT Going [{{ stats['-']|length }}]</b>:
{% for t in stats['-'] %}
    <i>{{loop.index}}.{{t.name}} {% if t.with_me>0 %}(+{{t.with_me}}){% endif %}</i>
{% endfor %}
"""

    _stats_template = Environment().from_string(match_stats_view)

    @staticmethod
    def build_match_stats_view(match):
        return MatchConfirmationView._stats_template.render(match=match, stats=match.stats())

    @staticmethod
    def pack_buttons(types):
        return list(map(lambda t: InlineKeyboardButton(BUTTON_CAPTION.get(t, t), callback_data=f"{t}"), types))


def main():
    token = os.environ.get('TG_BOT_TOKEN', None)
    if not token:
        raise ValueError('Bot token is not specified')
    GameManager(Updater(token)).start()


if __name__ == '__main__':
    main()
