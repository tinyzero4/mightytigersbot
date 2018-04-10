import datetime
import logging
import uuid
from functools import partial

logger = logging.getLogger(__name__)

CONFIRMATIONS = ['⚽', '💩', '🤔']
WITH_ME_CONFIRMATIONS = ['+1', '-1']


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
        self._id = str(uuid.uuid4())
        self.team_id = team_id
        self.date = date
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

    def is_before(self, datetime_to_compare):
        return self.date < datetime_to_compare

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
        return f"id:{self.match_id}|team_id:{self.team_id}|completed:{self.completed}|" \
               f"date:{self.date.strftime('%Y-%m-%d %H:%M%s')}|squad:{self.squad}"


class Schedule:

    def __init__(self, match_days):
        """Weekly scheduling."""
        if not match_days:
            raise ValueError(f"At least one day on week should be marked as match day")
        self.match_days = sorted(match_days, key=lambda d: d[0])

    def next_match_date(self):
        now = datetime.datetime.utcnow()

        is_after_now = partial(self.__is_next_on_this_week, now)

        match_days_on_this_week = list(filter(lambda day: is_after_now(day), map(self.__day_to_tuple, self.match_days)))

        if not match_days_on_this_week:
            (week_day, hour, minute) = self.__day_to_tuple(self.match_days[0])
            day_until_match = 7 - now.isoweekday() + int(week_day)
            return (now + datetime.timedelta(days=day_until_match)).replace(hour=int(hour), minute=int(minute),
                                                                            second=0, microsecond=0)
        else:
            (week_day, hour, minute) = match_days_on_this_week[0]
            day_until_match = int(week_day) - now.isoweekday()
            return (now + datetime.timedelta(days=day_until_match)).replace(hour=int(hour), minute=int(minute),
                                                                            second=0, microsecond=0)

    @staticmethod
    def __is_next_on_this_week(now, match_day):
        (match_day_weekday, match_day_hour, match_day_minute) = match_day
        return int(match_day_weekday) > now.isoweekday() or now.replace(hour=int(match_day_hour),
                                                                        minute=int(match_day_minute),
                                                                        second=0, microsecond=0) > now

    @staticmethod
    def __day_to_tuple(match_day):
        (hour, minute) = match_day[1].split(":")
        return match_day[0], hour, minute

    @staticmethod
    def parse_schedule(value):
        if value is None:
            return None

        return Schedule(list(map(lambda d: d.split(";"), [d for d in value.split("|")])))

    def __repr__(self):
        return f"week_days:{self.match_days}"


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

        if not latest_match or latest_match.is_before(next_match_date):
            return Match(next_match_date, self.team_id), latest_match, True
        return latest_match, None, False

    def __repr__(self):
        return f"name:{self.name}|team_id:{self.team_id}|schedule:{self.schedule}"
