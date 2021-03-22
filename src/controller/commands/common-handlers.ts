import {Observable, of, throwError} from "rxjs";
import {switchMap} from "rxjs/operators";
import {EMOJIS} from "../../constants";
import {DiscordController} from "../discord-controller";
import {Message} from "eris";
import {UnauthorizedError} from "../../errors/unauthorized.error";
import {Config} from "../../model/config";

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

export const validateAuthorIsAdmin = (config: Config, discordId: string): Observable<boolean> => {
    if(discordId === config.teacher.discordId) {
        return of(true);
    } else {
        return throwError(new UnauthorizedError())
    }
}

export const isAuthorAdmin = (config: Config, discordId: string): boolean => {
    return discordId === config.teacher.discordId;
}
