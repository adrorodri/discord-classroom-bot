import {catchError, mapTo, switchMap} from "rxjs/operators";
import {EMPTY, Observable} from "rxjs";
import {PersistenceController} from "../persistence-controller";
import {handleError, handleSuccess} from "./common-handlers";
import {DiscordController} from "../discord-controller";
import {Message} from "eris";
import {COLORS, EMOJIS, MESSAGES} from "../../constants";
import {Activity} from "../../model/activity";
import {Resource} from "../../model/session";
import {Config} from "../../model/config";

export class HelpCommand {
    constructor(private discord: DiscordController) {
    }
    execute(message: Message, args: string[]): Observable<boolean> {
        const channel = message.channel;
        return this.discord.sendMessageToChannel(channel, MESSAGES.HELP).pipe(
            switchMap(() => handleSuccess(this.discord, message, EMOJIS.THUMBS_UP))
        );
    }
}