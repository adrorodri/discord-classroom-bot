import {catchError, mapTo, switchMap} from "rxjs/operators";
import {EMPTY, Observable} from "rxjs";
import {PersistenceController} from "../persistence-controller";
import {handleError, handleSuccess} from "./common-handlers";
import {DiscordController} from "../discord-controller";
import {Message} from "eris";
import {Resource, Session} from "../../model/session";

export class NewSessionCommand {
    constructor(private persistence: PersistenceController, private discord: DiscordController) {
    }
    execute(message: Message, args: string[]): Observable<boolean> {
        const date = args[0];
        const resources = args.slice(1);
        return this.createNewSession(date, resources).pipe(
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