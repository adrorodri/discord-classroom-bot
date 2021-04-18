import {catchError, map, switchMap} from "rxjs/operators";
import {Observable, throwError, zip} from "rxjs";
import {PersistenceController} from "../persistence-controller";
import {handleError, handleSuccess} from "./common-handlers";
import {DiscordController} from "../discord-controller";
import {Message} from "eris";
import {Config} from "../../model/config";
import {MessageWithoutContentError} from "../../errors/message-without-content.error";
import {DIVIDER, EMPTY, TITLE_SPACER} from "../../constants";
import {GradesController} from "../grades-controller";
import {DateUtils} from "../../utils/date-utils";
import {CommonUtils} from "../../utils/common-utils";
import {FileController} from "../file-controller";

export class GradesOfCommand {
    private table = require('text-table');

    constructor(private persistence: PersistenceController,
                private fileController: FileController,
                private discord: DiscordController,
                private gradesController: GradesController,
                private config: Config) {
    }

    execute(message: Message, args: string[]): Observable<boolean> {
        if (!args || !args.length) {
            return throwError(new MessageWithoutContentError());
        }
        const discordId = args[0];

        const fileName = `grades_report_${CommonUtils.getBasicStringFromString(this.discord.getNameForDiscordId(discordId))}_${Date.now()}.txt`;
        const filePath = `${this.config.classes[0].code}_summary/${CommonUtils.getBasicStringFromString(this.discord.getNameForDiscordId(discordId))}`;
        const fileMessage = `Summary report for ${this.discord.getNameForDiscordId(discordId)} ${new Date().toString()}`;

        let totalActivitiesGradesByPartial: { [key: string]: string } = {};
        let totalParticipationGradesByPartial: { [key: string]: string } = {};
        return zip(this.persistence.getUser(discordId), this.persistence.getAllPreviousSessions(), this.persistence.getAllActivities()).pipe(
            map(([student, sessions, activities]) => {
                const title = `${this.discord.getNameForDiscordId(discordId)}`;
                let resultTable: [string[]] = [[title]];
                resultTable.push([`${new Date().toString()}`]);
                resultTable.push([DIVIDER]);
                resultTable.push([EMPTY]);
                const getActivitiesTable = (): [string[]] => {
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
                    });
                    return summaryTable;
                }
                const getParticipationsTable = (): [string[]] => {
                    const title = 'Participaciones:';
                    const participationsByPartials = this.gradesController.splitIntoPartials(student.participations.map(p => {
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
                    return summaryTable;
                }
                const getAttendanceTable = (): [string[]] => {
                    const title = 'Asistencia:';
                    const columnHeaders = ['Sesión', '  Fecha   ', 'Asistencia'];
                    const attendanceSummary = this.gradesController.calculateAttendanceSummary(sessions, student.attendance);
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
                    return summaryTable;
                }
                const getFinalGradesTable = (): [string[]] => {
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
                    return summaryTable;
                }
                getActivitiesTable().forEach(a => resultTable.push(a));
                resultTable.push([EMPTY]);
                getParticipationsTable().forEach(a => resultTable.push(a));
                resultTable.push([EMPTY]);
                getAttendanceTable().forEach(a => resultTable.push(a));
                resultTable.push([EMPTY]);
                getFinalGradesTable().forEach(a => resultTable.push(a));
                return resultTable;
            }),
            map(resultTable => {
                return this.table(resultTable, {hsep: '|'});
            }),
            switchMap(stringResponse => this.fileController.writeFile(filePath, fileName, stringResponse)),
            switchMap(() => this.fileController.readFile(filePath, fileName)),
            switchMap(buffer => this.discord.sendFileToChannelId(message.channel.id, fileMessage, buffer, fileName)),
            switchMap(() => handleSuccess(this.discord, message)),
            catchError(error => handleError(this.discord, message, error))
        );
    }
}