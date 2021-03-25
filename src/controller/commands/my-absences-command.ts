import {catchError, map, switchMap} from "rxjs/operators";
import {Observable, zip} from "rxjs";
import {PersistenceController} from "../persistence-controller";
import {handleError, handleSuccess} from "./common-handlers";
import {DiscordController} from "../discord-controller";
import {Message} from "eris";
import {Config} from "../../model/config";
import {Session} from "../../model/session";

export class MyAbsencesCommand {
    constructor(private persistence: PersistenceController, private discord: DiscordController, private config: Config) {
    }

    execute(message: Message, args: string[]): Observable<boolean> {
        const discordId = message.author.id;
        return zip(this.persistence.getAllSessions(), this.persistence.getAttendanceForDiscordId(discordId)).pipe(
            map(([sessions, attendance]) => this.filterSessionsUntilToday(sessions).length - attendance.length),
            switchMap(absences => this.discord.getDMChannelForDiscordId(discordId).pipe(
                switchMap(channelId => this.discord.sendMessageToChannelId(channelId, `Total ausencias: ${absences}`)))
            ),
            switchMap(() => handleSuccess(this.discord, message)),
            catchError(error => handleError(this.discord, message, error))
        );
    }

    private filterSessionsUntilToday(sessions: Session[]): Session[] {
        const today = Date.now();
        return sessions.filter(session => Date.parse(session.date) <= today);
    }
}