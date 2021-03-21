import {catchError, mapTo, switchMap} from "rxjs/operators";
import {EMPTY, Observable} from "rxjs";
import {PersistenceController} from "../persistence-controller";
import {handleError, handleSuccess} from "./common-handlers";
import {DiscordController} from "../discord-controller";
import {Message} from "eris";

export class RegisterCommand {
    constructor(private persistence: PersistenceController, private discord: DiscordController) {
    }
    execute(message: Message, discordId: string, args: string[]): Observable<boolean> {
        const universityId = args[1];
        if (universityId) {
            return this.registerDiscordId(discordId, universityId).pipe(
                switchMap(() => this.discord.getDMChannelForDiscordId(discordId)),
                switchMap(channel => this.discord.sendPrivateMessageToUser(channel, 'Registrado correctamente!')),
                switchMap(() => handleSuccess(this.discord, message)),
                catchError(error => handleError(this.discord, message, error))
            );
        } else {
            return EMPTY;
        }
    }

    private registerDiscordId = (discordId: string, universityId: string): Observable<boolean> => {
        return this.persistence.putRegisteredStudent(discordId, universityId).pipe(mapTo(true));
    }
}