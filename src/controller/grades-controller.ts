import {Activity} from "../model/activity";
import {Student} from "../model/student";
import {Session} from "../model/session";

export class GradesController {
    calculateActivitiesSummary(activitiesAvailable: Activity[], student: Student): {
        name: string,
        date: string,
        optional: boolean,
        presented: string,
        grade: string
    }[] {
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

    calculateActivitiesGrade(activitiesAvailable: Activity[], student: Student): string {
        const result = this.calculateActivitiesSummary(activitiesAvailable, student);
        const grade = result.reduce((sum, a) => sum + Number(a.grade || 0), 0) / result.filter(a => !a.optional).length;
        return grade.toFixed(1);
    }

    calculateParticipationsGrade(student: Student): string {
        return Math.min(Math.max(10 * student.participations.length / 5, 0), 10).toFixed(1);
    }

    calculateAbsences(sessions: Session[], attendance: string[]): number {
        return this.filterSessionsUntilToday(sessions).reduce((sum, session) => sum + (attendance.some(a => a === session.date) ? 0 : 1), 0)
    }

    private filterSessionsUntilToday(sessions: Session[]): Session[] {
        const today = Date.now();
        return sessions.filter(session => Date.parse(session.date) <= today);
    }
}