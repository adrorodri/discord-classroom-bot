import {PersistenceController} from "../persistence-controller";
import {DiscordController} from "../discord-controller";
import {Config} from "../../model/config";
import {Message} from "eris";
import {Observable, of, throwError} from "rxjs";
import {catchError, switchMap} from "rxjs/operators";
import {handleError, handleSuccess} from "./common-handlers";
import {DateUtils} from "../../utils/date-utils";
import {ParticipationInvalidError} from "../../errors/participation-invalid.error";

export class ParticipationCommand {
    constructor(private persistence: PersistenceController,
                private discord: DiscordController,
                private config: Config) {
    }

    execute(message: Message, args: string[]): Observable<boolean> {
        const discordId = message.author.id;
        return this.validateCurrentTime(this.config.classes[0].start_time, this.config.classes[0].end_time).pipe(
            switchMap(() => this.attendanceForDiscordId(discordId)),
            switchMap(() => handleSuccess(this.discord, message)),
            catchError(error => handleError(this.discord, message, error))
        )
    }

    private attendanceForDiscordId = (discordId: string): Observable<any> => {
        const today = DateUtils.getTodayAsString();
        return this.persistence.addParticipationForDiscordId(discordId, today);
    }

    private validateCurrentTime = (start: string, end: string): Observable<any> => {
        const isBetween = DateUtils.isBetween(start, end);
        if (isBetween) {
            return of(true);
        } else {
            return throwError(new ParticipationInvalidError())
        }
    }
}