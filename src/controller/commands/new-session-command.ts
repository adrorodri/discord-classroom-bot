import {catchError, switchMap} from "rxjs/operators";
import {Observable, of, throwError} from "rxjs";
import {PersistenceController} from "../persistence-controller";
import {handleError, handleSuccess} from "./common-handlers";
import {DiscordController} from "../discord-controller";
import {Message} from "eris";
import {Resource, Session} from "../../model/session";
import {Config} from "../../model/config";
import {UnauthorizedError} from "../../errors/unauthorized.error";

export class NewSessionCommand {
    constructor(private persistence: PersistenceController, private discord: DiscordController, private config: Config) {
    }

    private validateAuthor = (discordId: string): Observable<boolean> => {
        if(discordId === this.config.teacher.discordId) {
            return of(true);
        } else {
            return throwError(new UnauthorizedError())
        }
    }

    execute(message: Message, args: string[]): Observable<boolean> {
        const date = args[0];
        const resources = args.slice(1);
        const discordId = message.author.id;
        return this.validateAuthor(discordId).pipe(
            switchMap(() => this.createNewSession(date, resources)),
            switchMap(() => handleSuccess(this.discord, message)),
            catchError(error => handleError(this.discord, message, error))
        )
    }

    private createNewSession = (date: string, resources: string[] = []): Observable<Session> => {
        const parsedResources = resources.map(resource => {
            return <Resource>{
                name: resource.split("|")[0],
                value: resource.split("|")[1]
            }
        });
        return this.persistence.createNewSession(date, parsedResources);
    }
}