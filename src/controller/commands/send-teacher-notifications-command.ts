import {mapTo, switchMap} from "rxjs/operators";
import {Observable} from "rxjs";
import {PersistenceController} from "../persistence-controller";
import {DiscordController} from "../discord-controller";
import {Config} from "../../model/config";
import {Session} from "../../model/session";
import {COLORS} from "../../constants";

export class SendTeacherNotificationsCommand {
    constructor(private persistence: PersistenceController,
                private discord: DiscordController,
                private config: Config) {
    }

    sendStartClass(session: Session): Observable<boolean> {
        return this.discord.getDMChannelForDiscordId(this.config.teacher.discordId).pipe(
            switchMap(channelId => this.discord.sendEmbedMessageToChannelId(
                channelId,
                COLORS.INFO,
                session.name,
                [...session.resources, {
                    name: 'Codigo:',
                    value: session.attendanceCode
                }])),
            mapTo(true)
        )
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
}