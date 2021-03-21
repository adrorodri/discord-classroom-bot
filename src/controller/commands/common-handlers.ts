import {Observable} from "rxjs";
import {switchMap} from "rxjs/operators";
import {EMOJIS} from "../../constants";
import {DiscordController} from "../discord-controller";
import {Message} from "eris";

export const handleSuccess = (discord: DiscordController, message: Message, emoji: string = EMOJIS.CHECK): Observable<any> => {
    return discord.sendReactionToMessage(message, emoji)
}

export const handleError = (discord: DiscordController, message: Message, error): Observable<any> => {
    console.warn('Operation Error', error.message);
    return discord.sendErrorMessage(message, error).pipe(
        switchMap(() => discord.sendReactionToMessage(message, EMOJIS.ERROR))
    );
}

export const handleErrorWithoutMessage = (error) => {
    console.warn('Operation Error', error.message);
}