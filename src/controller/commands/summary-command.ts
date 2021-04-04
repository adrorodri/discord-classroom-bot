import {catchError, map, switchMap} from "rxjs/operators";
import {Observable} from "rxjs";
import {PersistenceController} from "../persistence-controller";
import {handleError, handleSuccess} from "./common-handlers";
import {DiscordController} from "../discord-controller";
import {Message} from "eris";
import {Config} from "../../model/config";
import {CommonUtils} from "../../utils/common-utils";
import {Student} from "../../model/student";

export class SummaryCommand {
    constructor(private persistence: PersistenceController, private discord: DiscordController, private config: Config) {
    }

    execute(message: Message, args: string[]): Observable<boolean> {
        let participationAvg = '0';
        let activitiesAvg = '0';

        return this.persistence.getAllUsers().pipe(
            switchMap(users => this.persistence.getAllPreviousSessions().pipe(
                map(sessions => {
                    const tableResults = [[
                        'Name',
                        'ID',
                        'Participations',
                        'Activities',
                        'Activities Avg',
                        'Absences',
                        'Warning'
                    ]];
                    const isWarning = (user: Student): boolean => {
                        return user.participations.length === 0 || user.activities.length === 0 || (sessions.length - user.attendance.length) === 3;
                    }
                    participationAvg = CommonUtils.getAverage(users.map(u => u.participations.length)).toFixed(1);
                    activitiesAvg = CommonUtils.getAverage(
                        users.map(u =>
                            CommonUtils.getAverage(
                                u.activities_grades && u.activities_grades.length ?
                                    u.activities_grades.map(ag => Number(ag.grade)) : [0]
                            )
                        )
                    ).toFixed(1);
                    users.forEach(user => {
                        tableResults.push([
                            this.discord.getNameForDiscordId(user.discordId) || 'No name?',
                            user.universityId,
                            user.participations.length ? user.participations.length.toString() : '-',
                            user.activities.length ? user.activities.length.toString() : '-',
                            user.activities_grades.length ? CommonUtils.getAverage(
                                user.activities_grades && user.activities_grades.length ?
                                    user.activities_grades.map(ag =>
                                        Number(ag.grade)
                                    ) : [0]
                            ).toFixed(1) : '-',
                            (sessions.length - user.attendance.length).toString(),
                            isWarning(user) ? 'YES' : ''])
                    });
                    return tableResults;
                }),
                map(resultTable => {
                    const table = require('text-table');
                    return '```' + table(resultTable) + '```';
                })
            )),
            switchMap(response => this.discord.sendMessageToChannelId(message.channel.id, response)),
            map(() => {
                const summaryTable = [['Avg Participations', 'Avg Activity Grades']];
                summaryTable.push([participationAvg, activitiesAvg]);
                const table = require('text-table');
                return '```' + table(summaryTable) + '```';
            }),
            switchMap(response => this.discord.sendMessageToChannelId(message.channel.id, response)),
            switchMap(() => handleSuccess(this.discord, message)),
            catchError(error => handleError(this.discord, message, error))
        );
    }
}