import {catchError, map, switchMap} from "rxjs/operators";
import {Observable, throwError, zip} from "rxjs";
import {PersistenceController} from "../persistence-controller";
import {handleError, handleSuccess} from "./common-handlers";
import {DiscordController} from "../discord-controller";
import {Message} from "eris";
import {Config} from "../../model/config";
import {MessageWithoutContentError} from "../../errors/message-without-content.error";
import {DateUtils} from "../../utils/date-utils";
import {Session} from "../../model/session";

export class GradesOfCommand {
    private table = require('text-table');

    constructor(private persistence: PersistenceController, private discord: DiscordController, private config: Config) {
    }

    execute(message: Message, args: string[]): Observable<boolean> {
        if(!args || !args.length){
            return throwError(new MessageWithoutContentError());
        }
        const discordId = args[0];
        return zip(this.persistence.getAllActivities(), this.persistence.getUser(discordId)).pipe(
            map(([actities, student]) => {
                return actities.map(activity => {
                    return {
                        name: activity.name.substr(0, 30),
                        date: activity.date,
                        optional: activity.optional,
                        presented: student.activities.some(a => a.activity === activity.date) ? "YES" : "NO",
                        grade: student.activities_grades.find(a => a.activity === activity.date)?.grade || ''
                    }
                });
            }),
            map(activities => {
                const title = 'Actividades:';
                const nota = activities.reduce((sum, a) => sum + Number(a.grade || 0), 0) / activities.filter(a => !a.optional).length;
                const footer = `Nota acumulada (no final): ${nota.toFixed(1)} / 10`;
                const summaryTable = [['Actividad', 'Fecha', 'Presentado', 'Calificación']];
                activities.forEach(actividad => summaryTable.push([actividad.name, actividad.date, actividad.presented, actividad.grade, actividad.optional ? '(opcional)' : '']));
                return '```' + title + '\n\n' + this.table(summaryTable) + '\n\n' + footer + '```';
            }),
            switchMap(response => this.discord.sendMessageToChannelId(message.channel.id, '```' + this.discord.getNameForDiscordId(discordId) + '```').pipe(
                switchMap(() => this.discord.sendMessageToChannelId(message.channel.id, response))
            )),
            switchMap(() => zip(this.persistence.getAllSessions(), this.persistence.getAttendanceForDiscordId(discordId)).pipe(
                map(([sessions, attendance]) => {
                    const title = 'Asistencia:';
                    const footer = 'Ausencias: ' + this.filterSessionsUntilToday(sessions).reduce((sum, session) => sum + (attendance.some(a => a === session.date) ? 0 : 1), 0);
                    const summaryTable = [['Sesión', 'Fecha', 'Asistencia']];
                    sessions.forEach(session => summaryTable.push([session.name.substr(0, 30), session.date, attendance.some(a => a === session.date) ? 'YES' : 'NO', session.date === DateUtils.getTodayAsString() ? '< HOY': '']));
                    return '```' + title + '\n\n' + this.table(summaryTable) + '\n\n' + footer + '```';
                }),
                switchMap(response => this.discord.sendMessageToChannelId(message.channel.id, response))
            )),
            switchMap(() => this.persistence.getUser(discordId).pipe(
                map(user => {
                    const title = 'Participaciones:';
                    const nota = Math.min(Math.max(10 * user.participations.length / 5, 0), 10);
                    const footer = `Nota acumulada (no final): ${nota.toFixed(1)} / 10`;
                    const summaryTable = [['Total: ', user.participations.length]];
                    return '```' + title + '\n\n' + this.table(summaryTable) + '\n\n' + footer + '```';
                }),
                switchMap(response => this.discord.sendMessageToChannelId(message.channel.id, response))
            )),
            switchMap(() => handleSuccess(this.discord, message)),
            catchError(error => handleError(this.discord, message, error))
        );
    }

    private filterSessionsUntilToday(sessions: Session[]): Session[] {
        const today = Date.now();
        return sessions.filter(session => Date.parse(session.date) <= today);
    }
}