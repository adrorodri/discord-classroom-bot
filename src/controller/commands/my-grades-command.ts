import {catchError, map, switchMap} from "rxjs/operators";
import {Observable, zip} from "rxjs";
import {PersistenceController} from "../persistence-controller";
import {handleError, handleSuccess} from "./common-handlers";
import {DiscordController} from "../discord-controller";
import {Message} from "eris";
import {Config} from "../../model/config";

export class MyGradesCommand {
    constructor(private persistence: PersistenceController, private discord: DiscordController, private config: Config) {
    }

    execute(message: Message, args: string[]): Observable<boolean> {
        const discordId = message.author.id;
        return zip(this.persistence.getAllActivities(), this.persistence.getUser(discordId)).pipe(
            map(([actities, student]) => {
                return actities.map(activity => {
                    return {
                        name: activity.name.substr(0, 30),
                        date: activity.date,
                        presented: student.activities.some(a => a.activity === activity.date) ? "YES" : "NO",
                        grade: student.activities_grades.find(a => a.activity === activity.date)?.grade || '-'
                    }
                });
            }),
            map(activities => {
                const summaryTable = [['Actividad', 'Fecha', 'Presentado', 'Calificación']];
                activities.forEach(actividad => summaryTable.push([actividad.name, actividad.date, actividad.presented, actividad.grade]));
                const table = require('text-table');
                return '```' + table(summaryTable) + '```';
            }),
            switchMap(response => this.discord.sendMessageToChannelId(message.channel.id, '```' + this.discord.getNameForDiscordId(discordId) + '```').pipe(
                switchMap(() => this.discord.sendMessageToChannelId(message.channel.id, response))
            )),
            switchMap(() => handleSuccess(this.discord, message)),
            catchError(error => handleError(this.discord, message, error))
        );
    }
}