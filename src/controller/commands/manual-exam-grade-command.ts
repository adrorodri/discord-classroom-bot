import {catchError, switchMap} from "rxjs/operators";
import {Observable} from "rxjs";
import {PersistenceController} from "../persistence-controller";
import {handleError, handleSuccess, validateAuthorIsAdmin} from "./common-handlers";
import {DiscordController} from "../discord-controller";
import {Message, PossiblyUncachedTextableChannel} from "eris";
import {Config} from "../../model/config";

export class ManualExamGradeCommand {
    constructor(private persistence: PersistenceController, private discord: DiscordController, private config: Config) {
    }

    execute(message: Message<PossiblyUncachedTextableChannel>, args: string[]): Observable<boolean> {
        const discordId = args[0];
        const partialName = args[1];
        const grade = args[2];
        const authorDiscordId = message.author.id;
        return validateAuthorIsAdmin(this.config, authorDiscordId).pipe(
            switchMap(() => this.persistence.addExamGradeToUser(discordId, partialName, grade)),
            switchMap(() => this.discord.sendMessageToChannelId(message.channel.id, `Confirmacion: ${this.discord.getNameForDiscordId(discordId)} -> ${partialName} -> ${grade}`)),
            switchMap(() => handleSuccess(this.discord, message)),
            catchError(error => handleError(this.discord, message, error))
        )
    }
}
