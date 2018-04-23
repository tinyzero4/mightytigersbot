const service = require("../src/services/schedule-service");
const config = require("../src/config");
const moment = require("moment");

const scheduleService = new service.ScheduleService({});
const DEFAULT_SCHEDULE = [{ day: 1, time: "05:00"}, {day:4 , time: "05:00"}];

test("should return match at 05:00 on Thursday on this week", () => {
  const team = {schedule: DEFAULT_SCHEDULE};
  const event = moment.utc(new Date()).set({'hour': 04, 'minute': 01}).startOf('minute').isoWeekday(2);
  
  expect(scheduleService.nextMatchDate(team, event.toDate()))
    .toEqual(event.isoWeekday(4).set({'hour': 05, 'minute': 00}).startOf('minute').toDate());
});

test("should return match at 05:00 on Monday on next week", () => {
  const team = {schedule: DEFAULT_SCHEDULE};
  const now = new Date();
  const event = moment.utc(now).set({'hour': 05, 'minute': 01}).startOf('minute').isoWeekday(4);
  
  expect(scheduleService.nextMatchDate(team, event.toDate()))
    .toEqual(moment.utc(now).add('week', 1).set({'hour': 05, 'minute': 00}).startOf('minute').isoWeekday(1).toDate());
});