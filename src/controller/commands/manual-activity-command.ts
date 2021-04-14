import {catchError, switchMap} from "rxjs/operators";
import {Observable} from "rxjs";
import {PersistenceController} from "../persistence-controller";
import {handleError, handleSuccess, validateAuthorIsAdmin} from "./common-handlers";
import {DiscordController} from "../discord-controller";
import {Message} from "eris";
import {Config} from "../../model/config";

export class ManualActivityCommand {
    constructor(private persistence: PersistenceController, private discord: DiscordController, private config: Config) {
    }

    execute(message: Message, args: string[]): Observable<boolean> {
        const discordId = args[0];
        const date = args[1];
        const presentation = args.slice(2);
        const authorDiscordId = message.author.id;
        return validateAuthorIsAdmin(this.config, authorDiscordId).pipe(
            switchMap(() => this.persistence.addActivityPresentationToDiscordId(discordId, date, presentation.join(' '))),
            switchMap(() => this.discord.sendMessageToChannelId(message.channel.id, `Confirmacion: ${this.discord.getNameForDiscordId(discordId)} -> ${date}`)),
            switchMap(() => handleSuccess(this.discord, message)),
            catchError(error => handleError(this.discord, message, error))
        )
    }
}