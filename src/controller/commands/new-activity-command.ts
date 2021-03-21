import {catchError, mapTo, switchMap} from "rxjs/operators";
import {EMPTY, Observable} from "rxjs";
import {PersistenceController} from "../persistence-controller";
import {handleError, handleSuccess} from "./common-handlers";
import {DiscordController} from "../discord-controller";
import {Message} from "eris";
import {COLORS} from "../../constants";
import {Activity} from "../../model/activity";
import {Resource} from "../../model/session";
import {Config} from "../../model/config";

export class NewActivityCommand {
    constructor(private persistence: PersistenceController, private discord: DiscordController, private config: Config) {
    }
    execute(message: Message, args: string[]): Observable<boolean> {
        const name = args[0];
        const date = args[1];
        const resources = args.slice(2);
        return this.createNewActivity(name, date, resources).pipe(
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