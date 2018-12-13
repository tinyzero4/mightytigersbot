import moment from "moment";
import {
    Team,
    MatchDay,
} from "@models/team";

export class SchedulerService {

    constructor() { }

    parseSchedule(schedule: String): MatchDay[] {
        if (!schedule) return []
        return schedule.split(",")
            .map(def => moment(def, "E@HH:mm"))
            .filter(m => m.isValid())
            .map(m => {
                const day: number = m.isoWeekday()
                const time: string = `${m.hour()}:${m.minutes()}`
                return { day, time }
            });
    }

    nextMatchDate(team: Team, now: Date): Date {
        if (!team.schedule) return now
        const matchDays = team.schedule.sort((l, r) => `${l.day}@${l.time}` > `${r.day}@${r.time}` ? 1 : -1)
        const nextOnWeek = matchDays.map(matchDay => this.matchDayToDate(matchDay, now)).find(date => date > now)
        return nextOnWeek || this.matchDayToDate(matchDays[0], moment.utc(now).add(1, "week").toDate())
    }

    private matchDayToDate(matchDay: MatchDay, date: Date): Date {
        const [hour, minute] = matchDay.time.split(":")
        return moment.utc(date)
            .isoWeekday(matchDay.day)
            .set({ hour: parseInt(hour), minute: parseInt(minute) })
            .startOf("minute")
            .toDate()
    }
}