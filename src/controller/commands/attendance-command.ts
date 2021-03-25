import {catchError, switchMap} from "rxjs/operators";
import {Observable, of, throwError} from "rxjs";
import {PersistenceController} from "../persistence-controller";
import {handleError, handleSuccess} from "./common-handlers";
import {DiscordController} from "../discord-controller";
import {Message} from "eris";
import {DateUtils} from "../../utils/date-utils";
import {AttendanceInvalidError} from "../../errors/attendance-invalid.error";
import {Config} from "../../model/config";

export class AttendanceCommand {
    constructor(private persistence: PersistenceController,
                private discord: DiscordController,
                private config: Config) {
    }

    execute(message: Message, args: string[]): Observable<boolean> {
        const discordId = message.author.id;
        return this.validateCurrentTime(this.config.classes[0].start_time, this.config.classes[0].attendance_end_time).pipe(
            switchMap(() => this.validateUserStatus(discordId, this.config.guildId)),
            switchMap(() => this.attendanceForDiscordId(discordId)),
            switchMap(() => handleSuccess(this.discord, message)),
            catchError(error => handleError(this.discord, message, error))
        )
    }

    private attendanceForDiscordId = (discordId: string): Observable<any> => {
        const today = DateUtils.getTodayAsString();
        return this.persistence.setAttendanceForDiscordId(discordId, today);
    }

    private validateCurrentTime = (start: string, end: string): Observable<any> => {
        const isBetween = DateUtils.isBetween(start, end);
        if (isBetween) {
            return of(true);
        } else {
            return throwError(new AttendanceInvalidError())
        }
    }

    private validateUserStatus = (discordId: string, guildId: string): Observable<boolean> => {
        return this.discord.validateIsUserOnlineFromDesktop(discordId, guildId);
    }
}