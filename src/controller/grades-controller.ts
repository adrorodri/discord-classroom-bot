import {Activity, ActivitySummary} from "../model/activity";
import {Student} from "../model/student";
import {AttendanceSummary, Session} from "../model/session";
import {Config} from "../model/config";
import {DateUtils} from "../utils/date-utils";

export class GradesController {
    constructor(private config: Config) {
    }

    calculateActivitiesSummary(activitiesAvailable: Activity[] | ActivitySummary[], student: Student): ActivitySummary[] {
        return activitiesAvailable.map(activity => {
            return {
                name: activity.name.substr(0, 30),
                date: activity.date,
                optional: activity.optional,
                presented: student.activities.some(a => a.activity === activity.date) ? "SI" : "NO",
                grade: student.activities_grades.find(a => a.activity === activity.date)?.grade || ''
            }
        })
    }

    calculateAttendanceSummary(sessionsAvailable: Session[], attendance: string[]): AttendanceSummary[] {
        return sessionsAvailable.map(session => {
            return {
                name: session.name.substr(0, 30),
                date: session.date,
                attended: attendance.some(a => a === session.date) ? "SI" : "NO"
            }
        })
    }

    calculateActivitiesGrade(activitiesAvailable: Activity[] | ActivitySummary[], student: Student): string {
        const result = this.calculateActivitiesSummary(activitiesAvailable, student);
        const grade = result.reduce((sum, a) => sum + Number(a.grade || 0), 0) / result.filter(a => !a.optional).length;
        return grade.toFixed(1);
    }

    calculateParticipationsGrade(participations: any[] = []): string {
        return Math.min(Math.max(10 * participations.length / 5, 0), 10).toFixed(1);
    }

    calculateAbsences(sessions: AttendanceSummary[]): number {
        return sessions.reduce((sum, session) => {
            return sum + (session.attended === 'NO' ? 1 : 0)
        }, 0);
    }

    splitIntoPartials<T extends { date: string }>(items: T[]): { [key: string]: T[] } {
        if (!items || !items.length) {
            return {};
        }
        return items.reduce((acc: { [key: string]: T[] }, item) => {
            const partial = this.config.partials.find(partial => DateUtils.isBetweenDates(partial.startDate, partial.endDate, item.date));
            if (partial) {
                acc[partial.name] = [...acc[partial.name] || [], item];
            }
            return acc;
        }, {});
    }

    private filterSessionsUntilToday(sessions: Session[]): Session[] {
        const today = Date.now();
        return sessions.filter(session => Date.parse(session.date) <= today);
    }

    calculateTotalGrade(activitiesGrade: string = '0', participationGrade: string = '0', examGrade: string = '0'): string {
        return (Number(activitiesGrade) + Number(participationGrade) + (Number(examGrade) * 0.8)).toFixed(1);
    }
}