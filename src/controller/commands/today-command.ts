import {mapTo, switchMap} from "rxjs/operators";
import {Observable} from "rxjs";
import {PersistenceController} from "../persistence-controller";
import {DiscordController} from "../discord-controller";
import {Message} from "eris";
import {Session} from "../../model/session";
import {DateUtils} from "../../utils/date-utils";
import {COLORS} from "../../constants";

export class TodayCommand {
    constructor(private persistence: PersistenceController, private discord: DiscordController) {
    }

    executeFromMessage(message: Message, args: string[]): Observable<boolean> {
        const channel = message.channel;
        return this.getTodaysSession().pipe(
            switchMap((session) => {
                return session ? this.discord.sendEmbedMessageToChannelId(
                    channel.id,
                    COLORS.INFO,
                    `Sesion de hoy ${DateUtils.getTodayAsString()}: ${session.name}`,
                    session.resources
                    ) :
                    this.discord.sendMessageToChannelId(channel.id, 'No existen sesiones registradas para hoy');
            }),
            mapTo(true)
        );
    }

    executeWithoutMessage(): Observable<Session> {
        return this.getTodaysSession();
    }

    private getTodaysSession = (): Observable<Session> => {
        const today = DateUtils.getTodayAsString();
        return this.persistence.getSessionForDate(today);
    }
}