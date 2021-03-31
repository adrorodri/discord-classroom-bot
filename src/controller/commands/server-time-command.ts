import {switchMap} from "rxjs/operators";
import {Observable} from "rxjs";
import {handleSuccess} from "./common-handlers";
import {DiscordController} from "../discord-controller";
import {Message} from "eris";
import {EMOJIS} from "../../constants";
import {Config} from "../../model/config";

export class ServerTimeCommand {
    constructor(private discord: DiscordController, private config: Config) {
    }

    execute(message: Message, args: string[]): Observable<boolean> {
        const channel = message.channel;
        return this.discord.sendMessageToChannel(channel, (new Date()).toString()).pipe(
            switchMap(() => handleSuccess(this.discord, message, EMOJIS.THUMBS_UP))
        );
    }
}