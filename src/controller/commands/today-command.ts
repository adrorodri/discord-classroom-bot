import {mapTo, switchMap} from "rxjs/operators";
import {Observable} from "rxjs";
import {PersistenceController} from "../persistence-controller";
import {DiscordController} from "../discord-controller";
import {Message, PossiblyUncachedTextableChannel} from "eris";
import {Session} from "../../model/session";
import {DateUtils} from "../../utils/date-utils";
import {COLORS} from "../../constants";
import {Activity} from "../../model/activity";

export class TodayCommand {
    constructor(private persistence: PersistenceController, private discord: DiscordController) {
    }

    executeFromMessage(message: Message<PossiblyUncachedTextableChannel>, args: string[]): Observable<boolean> {
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
            switchMap(() => this.getTodaysActivity()),
            switchMap((activity) => {
                return activity ? this.discord.sendEmbedMessageToChannelId(
                    channel.id,
                    COLORS.INFO,
                    `Actividad de hoy ${DateUtils.getTodayAsString()}: ${activity.name}`,
                    [
                        ...activity.resources,
                        {
                            name: 'Hora de entraga maxima:',
                            value: '23:59'
                        }
                    ]
                    ) :
                    this.discord.sendMessageToChannelId(channel.id, 'No existen actividades registradas para hoy');
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

    private getTodaysActivity = (): Observable<Activity> => {
        const today = DateUtils.getTodayAsString();
        return this.persistence.getActivityForDate(today);
    }
}
