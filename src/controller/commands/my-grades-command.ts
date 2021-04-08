import {catchError, map, switchMap} from "rxjs/operators";
import {Observable, zip} from "rxjs";
import {PersistenceController} from "../persistence-controller";
import {handleError, handleSuccess} from "./common-handlers";
import {DiscordController} from "../discord-controller";
import {Message} from "eris";
import {Config} from "../../model/config";
import {DateUtils} from "../../utils/date-utils";
import {GradesController} from "../grades-controller";

export class MyGradesCommand {
    private table = require('text-table');

    constructor(private persistence: PersistenceController, private discord: DiscordController, private gradesController: GradesController, private config: Config) {
    }

    execute(message: Message, args: string[]): Observable<boolean> {
        const discordId = message.author.id;
        return zip(this.persistence.getAllActivities(), this.persistence.getUser(discordId)).pipe(
            map(([activities, student]) => {
                const title = 'Actividades:';
                const activitiesSummary = this.gradesController.calculateActivitiesSummary(activities, student);
                const footer = `Nota acumulada (no final): ${this.gradesController.calculateActivitiesGrade(activities, student)} / 10.0`;
                const summaryTable = [['Actividad', 'Fecha', 'Presentado', 'Calificación']];
                activitiesSummary.forEach(actividad => summaryTable.push([actividad.name, actividad.date, actividad.presented, actividad.grade, actividad.optional ? '(opcional)' : '']));
                return '```' + title + '\n\n' + this.table(summaryTable) + '\n\n' + footer + '```';
            }),
            switchMap(response => this.discord.sendMessageToChannelId(message.channel.id, '```' + this.discord.getNameForDiscordId(discordId) + '```').pipe(
                switchMap(() => this.discord.sendMessageToChannelId(message.channel.id, response))
            )),
            switchMap(() => this.persistence.getUser(discordId).pipe(
                map(user => {
                    const title = 'Participaciones:';
                    const footer = `Nota acumulada (no final): ${this.gradesController.calculateParticipationsGrade(user)} / 10.0`;
                    const summaryTable = [['Total: ', user.participations.length]];
                    user.participations.forEach(participation => summaryTable.push([participation.substr(0, 10)]))
                    return '```' + title + '\n\n' + this.table(summaryTable) + '\n\n' + footer + '```';
                }),
                switchMap(response => this.discord.sendMessageToChannelId(message.channel.id, response))
            )),
            switchMap(() => zip(this.persistence.getAllSessions(), this.persistence.getAttendanceForDiscordId(discordId)).pipe(
                map(([sessions, attendance]) => {
                    const title = 'Asistencia:';
                    const footer = 'Ausencias: ' + this.gradesController.calculateAbsences(sessions, attendance);
                    const summaryTable = [['Sesión', 'Fecha', 'Asistencia']];
                    sessions.forEach(session => summaryTable.push([session.name.substr(0, 30), session.date, attendance.some(a => a === session.date) ? 'SI' : 'NO', session.date === DateUtils.getTodayAsString() ? '< HOY' : '']));
                    return '```' + title + '\n\n' + this.table(summaryTable) + '\n\n' + footer + '```';
                }),
                switchMap(response => this.discord.sendMessageToChannelId(message.channel.id, response))
            )),
            switchMap(() => handleSuccess(this.discord, message)),
            catchError(error => handleError(this.discord, message, error))
        );
    }
}