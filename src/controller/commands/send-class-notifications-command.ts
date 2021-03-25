import {mapTo} from "rxjs/operators";
import {Observable} from "rxjs";
import {PersistenceController} from "../persistence-controller";
import {DiscordController} from "../discord-controller";
import {Config} from "../../model/config";
import {Resource} from "../../model/session";
import {COLORS} from "../../constants";

export class SendClassNotificationsCommand {
    constructor(private persistence: PersistenceController,
                private discord: DiscordController,
                private config: Config) {
    }

    sendStartClass(resources: Resource[] = []): Observable<boolean> {
        return this.discord.sendEmbedMessageToChannelId(
            this.config.channels.attendance,
            COLORS.INFO,
            'La clase esta por comenzar',
            [...resources, {
                name: 'Unirse al canal:',
                value: this.discord.getChannelNameForId(this.config.channels.main_voice)
            }, {
                name: 'Mandar el attendance a:',
                value: this.discord.getChannelNameForId(this.config.channels.attendance)
            }]).pipe(mapTo(true))
    }

    sendEndClass(): Observable<boolean> {
        return this.discord.sendEmbedMessageToChannelId(
            this.config.channels.attendance,
            COLORS.INFO,
            'La clase termino',
            []
        ).pipe(mapTo(true));
    }

    sendWarningAttendance(minutes: number): Observable<boolean> {
        return this.discord.sendEmbedMessageToChannelId(
            this.config.channels.attendance,
            COLORS.SUCCESS,
            `El registro de attendance esta por terminar (${minutes} minutos).`,
            []
        ).pipe(mapTo(true));
    }

    sendEndAttendance(): Observable<boolean> {
        return this.discord.sendEmbedMessageToChannelId(
            this.config.channels.attendance,
            COLORS.SUCCESS,
            'El registro de attendance terminó.',
            []
        ).pipe(mapTo(true));
    }
}