import {catchError, map, switchMap} from "rxjs/operators";
import {Observable, throwError, zip} from "rxjs";
import {PersistenceController} from "../persistence-controller";
import {handleError, handleSuccess} from "./common-handlers";
import {DiscordController} from "../discord-controller";
import {Message} from "eris";
import {Config} from "../../model/config";
import {MessageWithoutContentError} from "../../errors/message-without-content.error";
import {DIVIDER, TITLE_SPACER} from "../../constants";
import {GradesController} from "../grades-controller";
import {Student} from "../../model/student";
import {DateUtils} from "../../utils/date-utils";

export class GradesOfCommand {
    private table = require('text-table');

    constructor(private persistence: PersistenceController, private discord: DiscordController, private gradesController: GradesController, private config: Config) {
    }

    execute(message: Message, args: string[]): Observable<boolean> {
        if (!args || !args.length) {
            return throwError(new MessageWithoutContentError());
        }
        const discordId = args[0];

        let student: Student;
        let totalActivitiesGradesByPartial: { [key: string]: string } = {};
        let totalParticipationGradesByPartial: { [key: string]: string } = {};
        return zip(this.persistence.getAllActivities(), this.persistence.getUser(discordId)).pipe(
            map(([activities, student]) => {
                const title = 'Actividades:';
                const columnHeaders = ['Actividad', '  Fecha   ', 'Presentado', 'Calificación', 'Opcional'];
                const activitiesSummary = this.gradesController.calculateActivitiesSummary(activities, student);
                const activitiesSummaryByPartials = this.gradesController.splitIntoPartials(activitiesSummary);

                const summaryTable: [string[]] = [[title]];
                Object.keys(activitiesSummaryByPartials).forEach(partialName => {
                    summaryTable.push([DIVIDER])
                    summaryTable.push([TITLE_SPACER + partialName]);
                    summaryTable.push([DIVIDER])
                    summaryTable.push(columnHeaders);
                    activitiesSummaryByPartials[partialName].forEach(actividad => summaryTable.push([actividad.name, actividad.date, actividad.presented, actividad.grade, actividad.optional ? '(opcional)' : '']));
                    const grade = this.gradesController.calculateActivitiesGrade(activitiesSummaryByPartials[partialName], student);
                    totalActivitiesGradesByPartial[partialName] = grade;
                    const footer = `Nota acumulada (no final): ${grade} / 10.0`;
                    summaryTable.push([footer]);
                    summaryTable.push([' '])
                });

                return '```' + this.table(summaryTable, {hsep: '|', align: ['l', 'l', 'c', 'c', 'l']}) + '```';
            }),
            switchMap(response => this.discord.sendMessageToChannelId(message.channel.id, '```' + this.discord.getNameForDiscordId(discordId) + '```').pipe(
                switchMap(() => this.discord.sendMessageToChannelId(message.channel.id, response))
            )),
            switchMap(() => this.persistence.getUser(discordId).pipe(
                map(user => {
                    student = user;
                    const title = 'Participaciones:';
                    const participationsByPartials = this.gradesController.splitIntoPartials(user.participations.map(p => {
                        return {date: p.substr(0, 10)}
                    }));

                    const summaryTable: [string[]] = [[title]];
                    Object.keys(participationsByPartials).forEach(partialName => {
                        summaryTable.push([DIVIDER])
                        summaryTable.push([TITLE_SPACER + partialName]);
                        summaryTable.push([DIVIDER])
                        participationsByPartials[partialName].forEach(participation => summaryTable.push([participation.date]))
                        const grade = this.gradesController.calculateParticipationsGrade(participationsByPartials[partialName]);
                        totalParticipationGradesByPartial[partialName] = grade;
                        const footer1 = [`Total Participaciones: ${participationsByPartials[partialName].length}`];
                        const footer2 = [`Nota acumulada (no final): ${grade} / 10.0`];
                        summaryTable.push(footer1);
                        summaryTable.push(footer2);
                    });

                    return '```' + this.table(summaryTable, {hsep: '|', align: ['l']}) + '```';
                }),
                switchMap(response => this.discord.sendMessageToChannelId(message.channel.id, response))
            )),
            switchMap(() => zip(this.persistence.getAllSessions(), this.persistence.getAttendanceForDiscordId(discordId)).pipe(
                map(([sessions, attendance]) => {
                    const title = 'Asistencia:';
                    const columnHeaders = ['Sesión', '  Fecha   ', 'Asistencia'];
                    const attendanceSummary = this.gradesController.calculateAttendanceSummary(sessions, attendance);
                    const attendanceSummaryByPartials = this.gradesController.splitIntoPartials(attendanceSummary);

                    const summaryTable: [string[]] = [[title]];
                    Object.keys(attendanceSummaryByPartials).forEach(partialName => {
                        summaryTable.push([DIVIDER])
                        summaryTable.push([TITLE_SPACER + partialName]);
                        summaryTable.push([DIVIDER])
                        summaryTable.push(columnHeaders);
                        attendanceSummaryByPartials[partialName].forEach(attendance => summaryTable.push([attendance.name, attendance.date, attendance.attended]))
                        const footer = 'Ausencias: ' + this.gradesController.calculateAbsences(attendanceSummaryByPartials[partialName]);
                        summaryTable.push([footer]);
                    });
                    return '```' + this.table(summaryTable, {hsep: '|', align: ['l', 'l', 'c']}) + '```';
                }),
                switchMap(response => this.discord.sendMessageToChannelId(message.channel.id, response))
            )),
            switchMap(() => {
                const title = 'Nota final:';
                const columnHeaders = ['Actividades', 'Participaciones', '   Examen   ', '   Nota Final   '];
                const summaryTable: [string[]] = [[title]];
                this.config.partials.filter(partial => DateUtils.isAfter(partial.startDate)).forEach(partial => {
                    summaryTable.push([DIVIDER]);
                    summaryTable.push([TITLE_SPACER + partial.name]);
                    summaryTable.push([DIVIDER]);
                    summaryTable.push(columnHeaders);
                    const activitiesGrade = totalActivitiesGradesByPartial[partial.name] || '0';
                    const participationsGrade = totalParticipationGradesByPartial[partial.name] || '0';
                    const examGrade = student.exams_grades.find(exam => exam.partialName === partial.name)?.grade ?? '0';
                    const totalGrade = this.gradesController.calculateTotalGrade(
                        activitiesGrade,
                        participationsGrade,
                        examGrade
                    );
                    summaryTable.push([
                        activitiesGrade,
                        participationsGrade,
                        examGrade,
                        totalGrade
                    ]);
                });

                const response = '```' + this.table(summaryTable, {hsep: '|', align: ['l', 'c', 'c', 'c']}) + '```';
                return this.discord.sendMessageToChannelId(message.channel.id, response);
            }),
            switchMap(() => handleSuccess(this.discord, message)),
            catchError(error => handleError(this.discord, message, error))
        );
    }
}