const service = require('../src/services/scheduler-service');
const moment = require('moment');

const scheduleService = new service.SchedulerService();
const DEFAULT_SCHEDULE = [
  {
    day: 1,
    time: '05:00',
  },
  {
    day: 4,
    time: '05:00',
  },
];

test('should return match at 05:00 on Thursday on this week', () => {
  const team = {
    schedule: DEFAULT_SCHEDULE,
  };
  const event = moment.utc(new Date())
    .set({
      hour: 4,
      minute: 1,
    })
    .startOf('minute')
    .isoWeekday(2);

  expect(scheduleService.nextMatchDate(team, event.toDate()))
    .toEqual(event.isoWeekday(4)
      .set({
        hour: 5,
        minute: 0,
      }).startOf('minute').toDate());
});

test('should return match at 05:00 on Monday on next week', () => {
  const team = {
    schedule: DEFAULT_SCHEDULE,
  };
  const now = new Date();
  const event = moment.utc(now)
    .set({
      hour: 5,
      minute: 1,
    })
    .startOf('minute')
    .isoWeekday(4);

  expect(scheduleService.nextMatchDate(team, event.toDate()))
    .toEqual(moment.utc(now).add('week', 1)
      .set({
        hour: 5,
        minute: 0,
      }).startOf('minute')
      .isoWeekday(1)
      .toDate());
});

test('should return match on month rollover', () => {
  const team = {
    schedule: [{
      day: 5,
      time: '05:00',
    }],
  };
  const timeTravel = moment.utc('2018-04-27T06').toDate();
  expect(scheduleService.nextMatchDate(team, timeTravel)).toEqual(moment.utc('2018-05-04T05:00').toDate());
});