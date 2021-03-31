import {PersistenceController} from "../persistence-controller";
import {DiscordController} from "../discord-controller";
import {Config} from "../../model/config";
import {Message} from "eris";
import {Observable, throwError} from "rxjs";
import {catchError, switchMap} from "rxjs/operators";
import {handleError, handleSuccess} from "./common-handlers";
import {DateUtils} from "../../utils/date-utils";
import {MessageWithoutContentError} from "../../errors/message-without-content.error";

export class ManualAttendanceCommand {
    constructor(private persistence: PersistenceController,
                private discord: DiscordController,
                private config: Config) {
    }

    execute(message: Message, args: string[]): Observable<boolean> {
        if (!args.length || args.length < 2) {
            return throwError(new MessageWithoutContentError())
        }
        const discordId = args[0];
        let date = args[1];
        if (date === 'today') {
            date = DateUtils.getTodayAsString()
        }
        return this.attendanceForDiscordId(discordId, date).pipe(
            switchMap(() => this.discord.getDMChannelForDiscordId(discordId)),
            switchMap(channelId => this.discord.sendMessageToChannelId(channelId, `Asistencia ha sido agregada para la sesión: ${date}`)),
            switchMap(() => handleSuccess(this.discord, message)),
            catchError(error => handleError(this.discord, message, error))
        )
    }

    private attendanceForDiscordId = (discordId: string, date: string): Observable<any> => {
        return this.persistence.setAttendanceForDiscordId(discordId, date);
    }
}