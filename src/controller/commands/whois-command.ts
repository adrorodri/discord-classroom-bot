import {catchError, switchMap} from "rxjs/operators";
import {Observable, throwError} from "rxjs";
import {PersistenceController} from "../persistence-controller";
import {handleError, handleSuccess} from "./common-handlers";
import {DiscordController} from "../discord-controller";
import {Message, PossiblyUncachedTextableChannel} from "eris";
import {Config} from "../../model/config";
import {MessageWithoutContentError} from "../../errors/message-without-content.error";

export class WhoisCommand {
    constructor(private persistence: PersistenceController, private discord: DiscordController, private config: Config) {
    }

    execute(message: Message<PossiblyUncachedTextableChannel>, args: string[]): Observable<boolean> {
        if (!args.length) {
            return throwError(new MessageWithoutContentError());
        }
        const discordId = args[0];
        return this.persistence.getUniversityIdFromDiscordId(discordId).pipe(
            switchMap(universityId => this.discord.sendMessageToChannelId(message.channel.id, universityId + ' - ' + this.discord.getNameForDiscordId(discordId) || 'No name?')),
            switchMap(() => handleSuccess(this.discord, message)),
            catchError(error => handleError(this.discord, message, error))
        );
    }
}
