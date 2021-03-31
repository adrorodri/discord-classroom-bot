import {mapTo, switchMap} from "rxjs/operators";
import {Observable} from "rxjs";
import {PersistenceController} from "../persistence-controller";
import {DiscordController} from "../discord-controller";
import {Config} from "../../model/config";
import {Resource} from "../../model/session";
import {COLORS} from "../../constants";
import {DateUtils} from "../../utils/date-utils";

export class SendClassNotificationsCommand {
    constructor(private persistence: PersistenceController,
                private discord: DiscordController,
                private config: Config) {
    }

    sendStartClass(resources: Resource[] = []): Observable<boolean> {
        return this.discord.sendEmbedMessageToChannelId(
            this.config.channels.announcements,
            COLORS.INFO,
            'La clase esta por comenzar',
            [...resources, {
                name: 'Unirse al canal:',
                value: this.discord.getChannelNameForId(this.config.channels.main_voice)
            }, {
                name: 'Mandar el attendance a:',
                value: this.discord.getChannelNameForId(this.config.channels.announcements)
            }]).pipe(mapTo(true))
    }

    sendEndClass(): Observable<boolean> {
        return this.discord.sendEmbedMessageToChannelId(
            this.config.channels.announcements,
            COLORS.INFO,
            'La clase termino',
            []
        ).pipe(mapTo(true));
    }

    sendWarningAttendance(minutes: number): Observable<boolean> {
        return this.discord.sendEmbedMessageToChannelId(
            this.config.channels.announcements,
            COLORS.SUCCESS,
            `El registro de attendance esta por terminar (${minutes} minutos).`,
            []
        ).pipe(mapTo(true));
    }

    sendEndAttendance(): Observable<boolean> {
        return this.discord.sendEmbedMessageToChannelId(
            this.config.channels.announcements,
            COLORS.SUCCESS,
            'El registro de attendance terminó.',
            []
        ).pipe(mapTo(true));
    }

    sendTodaysActivityNotification(): Observable<boolean> {
        const today = DateUtils.getTodayAsString();
        return this.persistence.getActivityForDate(today).pipe(
            switchMap(activity => this.discord.sendEmbedMessageToChannelId(
                this.config.channels.announcements,
                COLORS.SUCCESS,
                `Nueva actividad para hoy!\n${activity.name}\nFecha y hora limite: ${activity.date} 23:59`,
                activity.resources)
            ),
            mapTo(true)
        )
    }

    sendTodaysActivityReminder(): Observable<boolean> {
        const today = DateUtils.getTodayAsString();
        return this.persistence.getActivityForDate(today).pipe(
            switchMap(activity => this.discord.sendEmbedMessageToChannelId(
                this.config.channels.announcements,
                COLORS.SUCCESS,
                `Recordatorio de actividad:\n${activity.name}\nFecha y hora limite: ${activity.date} 23:59`,
                activity.resources)
            ),
            mapTo(true)
        )
    }
}