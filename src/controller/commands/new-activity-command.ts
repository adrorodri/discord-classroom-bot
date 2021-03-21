import {catchError, mapTo, switchMap} from "rxjs/operators";
import {EMPTY, Observable, of, throwError} from "rxjs";
import {PersistenceController} from "../persistence-controller";
import {handleError, handleSuccess} from "./common-handlers";
import {DiscordController} from "../discord-controller";
import {Message} from "eris";
import {COLORS} from "../../constants";
import {Activity} from "../../model/activity";
import {Resource} from "../../model/session";
import {Config} from "../../model/config";
import {UnauthorizedError} from "../../errors/unauthorized.error";

export class NewActivityCommand {
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
        const name = args[0];
        const date = args[1];
        const resources = args.slice(2);
        const discordId = message.author.id;
        return this.validateAuthor(discordId).pipe(
            switchMap(() => this.createNewActivity(name, date, resources)),
            switchMap(activity => this.discord.sendEmbedMessageToChannelId(
                this.config.channels.activities,
                COLORS.SUCCESS,
                `New Activity!\n${activity.name}\nDue Date: ${activity.date}`,
                activity.resources)
            ),
            switchMap(() => handleSuccess(this.discord, message)),
            catchError(error => handleError(this.discord, message, error))
        )
    }

    private createNewActivity = (name: string, date: string, resources: string[] = []): Observable<Activity> => {
        const parsedResources = resources.map(resource => {
            return <Resource>{
                name: resource.split("|")[0],
                value: resource.split("|")[1]
            }
        });
        return this.persistence.createNewActivity(name, date, parsedResources);
    }
}