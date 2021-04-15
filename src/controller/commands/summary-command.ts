import {catchError, map, switchMap} from "rxjs/operators";
import {forkJoin, Observable} from "rxjs";
import {PersistenceController} from "../persistence-controller";
import {handleError, handleSuccess} from "./common-handlers";
import {DiscordController} from "../discord-controller";
import {Message} from "eris";
import {Config} from "../../model/config";
import {CommonUtils} from "../../utils/common-utils";
import {Student} from "../../model/student";
import {GradesController} from "../grades-controller";
import {DateUtils} from "../../utils/date-utils";
import {DIVIDER, TITLE_SPACER} from "../../constants";
import {FileController} from "../file-controller";

export class SummaryCommand {
    private table = require('text-table');

    constructor(private persistence: PersistenceController,
                private fileController: FileController,
                private discord: DiscordController,
                private gradesController: GradesController,
                private config: Config) {
    }

    execute(message: Message, args: string[]): Observable<boolean> {
        const fileName = `summary_report_${Date.now()}.txt`;
        const filePath = `${this.config.classes[0].code}_summary`;
        const fileMessage = `Summary report for ${new Date().toString()}`;

        return this.persistence.getAllUsers().pipe(
            switchMap(users => forkJoin(this.persistence.getAllPreviousSessions(), this.persistence.getAllActivities()).pipe(
                map(([sessions, activities]) => {
                    const title = 'SUMMARY'
                    const columnNames = ['Name', 'Discord', 'ID', 'P Num', 'P Grade', 'Act Num', 'Act Grade', 'Exam Grade', 'Total Grade', 'Absences', 'Warning'];
                    const tableResults = [[title]];

                    const isWarning = (user: Student): boolean => {
                        return user.participations.length === 0 || user.activities.length === 0 || (sessions.length - user.attendance.length) === 3;
                    }

                    this.config.partials.forEach(partial => {
                        tableResults.push([DIVIDER]);
                        tableResults.push([TITLE_SPACER + partial.name]);
                        tableResults.push([DIVIDER]);
                        tableResults.push(columnNames);
                        const isInPartial = (date): boolean => {
                            return DateUtils.isBetweenDates(partial.startDate, partial.endDate, date);
                        }
                        const sessionsInPartial = sessions.filter(s => isInPartial(s.date));
                        const activitiesInPartial = activities.filter(a => isInPartial(a.date));

                        let participationAvg: string = CommonUtils.getAverage(
                            users.map(u => u.participations.filter(p => isInPartial(p.substr(0, 10))).length)
                        ).toFixed(1);
                        let activitiesAvg: string = CommonUtils.getAverage(
                            users.map(u =>
                                CommonUtils.getAverage(
                                    u.activities_grades && u.activities_grades.length ?
                                        u.activities_grades.filter(a => isInPartial(a.activity)).map(ag => Number(ag.grade)) : [0]
                                )
                            )
                        ).toFixed(1);
                        users.forEach(user => {
                            const attendanceInPartial = user.attendance.filter(a => isInPartial(a));
                            const attendanceSummary = this.gradesController.calculateAttendanceSummary(sessionsInPartial, attendanceInPartial);
                            const activitiesSummary = this.gradesController.calculateActivitiesSummary(activitiesInPartial, user);

                            const activitiesGrade = this.gradesController.calculateActivitiesGrade(activitiesSummary, user);
                            const participationsGrade = this.gradesController.calculateParticipationsGrade(user.participations.filter(p => isInPartial(p.substr(0, 10))));
                            const examGrade = user.exams_grades.find(e => e.partialName === partial.name)?.grade ?? '0';

                            tableResults.push([
                                this.discord.getNameForDiscordId(user.discordId) || 'No name?',
                                user.discordId,
                                user.universityId,
                                user.participations?.filter(p => isInPartial(p.substr(0, 10)))?.length.toString() ?? '0',
                                participationsGrade,
                                activitiesSummary.filter(a => a.presented === 'SI').length.toString() ?? '0',
                                activitiesGrade,
                                examGrade,
                                this.gradesController.calculateTotalGrade(activitiesGrade, participationsGrade, examGrade),
                                this.gradesController.calculateAbsences(attendanceSummary).toString(),
                                isWarning(user) ? 'WARN' : ''])
                        });
                        tableResults.push([DIVIDER]);
                        tableResults.push(['Avg Part', 'Avg Act']);
                        tableResults.push([participationAvg, activitiesAvg]);
                    });
                    return tableResults;
                }),
                map(resultTable => {
                    return this.table(resultTable, {hsep: '|'});
                })
            )),
            switchMap(stringResponse => this.fileController.writeFile(filePath, fileName, stringResponse)),
            switchMap(() => this.fileController.readFile(filePath, fileName)),
            switchMap(buffer => this.discord.sendFileToChannelId(message.channel.id, fileMessage, buffer, fileName)),
            switchMap(() => handleSuccess(this.discord, message)),
            catchError(error => handleError(this.discord, message, error))
        );
    }
}