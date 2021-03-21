import {catchError, map, mapTo, switchMap} from "rxjs/operators";
import {EMPTY, Observable} from "rxjs";
import {PersistenceController} from "../persistence-controller";
import {handleError, handleSuccess} from "./common-handlers";
import {DiscordController} from "../discord-controller";
import {Message} from "eris";
import {Session} from "../../model/session";
import {DateUtils} from "../../utils/date-utils";

export class TodayCommand {
    constructor(private persistence: PersistenceController, private discord: DiscordController) {
    }
    execute(message: Message, args: string[]): Observable<boolean> {
        const channel = message.channel;
        return this.getTodaysSession().pipe(
            map(session => JSON.stringify(session)),
            switchMap((session) => this.discord.sendMessageToChannel(channel, session)),
            mapTo(true)
        );
    }

    private getTodaysSession = (): Observable<Session> => {
        const today = DateUtils.getTodayAsString();
        return this.persistence.getSessionForDate(today);
    }
}