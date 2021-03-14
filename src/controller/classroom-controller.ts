import {DateUtils} from "../utils/date-utils";
import {Message, PrivateChannel} from "eris";
import {EMPTY, Observable, of, throwError} from "rxjs";
import {CHANNELS, COMMANDS, EMOJIS, MESSAGES, TIMES} from "../constants";
import {catchError, map, mapTo, switchMap} from "rxjs/operators";
import {PersistanceController} from "./persistance-controller";
import {DiscordController} from "./discord-controller";
import {Session} from "../model/session";
import {AttendanceInvalidError} from "../errors/attendance-invalid.error";

export class ClassroomController {
    private persistance: PersistanceController;

    constructor(classId: string, private discord: DiscordController) {
        this.persistance = new PersistanceController(classId);
    }

    processMessage(message: Message): Observable<any> {
        const channel = message.channel;
        const channelName = message.channel['name'];
        const content = message.content.split(" ")[0];
        const args = message.content.split(" ").slice(1);
        const discordId = message.author.id;
        const isFromChannelAndCommand = (channel: string, command: string): boolean => {
            const isDmMessage = message.channel instanceof PrivateChannel;
            return (channelName === channel || isDmMessage) && content.toLowerCase().startsWith(command)
        }
        if (isFromChannelAndCommand(CHANNELS.SESSIONS, COMMANDS.REGISTER)) {
            const universityId = args[1];
            if (universityId) {
                return this.registerDiscordId(discordId, universityId).pipe(
                    switchMap(() => this.getDMChannelForDiscordId(discordId)),
                    switchMap(channel => this.discord.sendPrivateMessageToUser(channel, 'Registrado correctamente!')),
                    switchMap(() => this.discord.sendReactionToMessage(message, EMOJIS.CHECK)),
                    catchError(error => {
                        console.warn('Operation Error', error);
                        return this.discord.sendErrorMessage(message, error).pipe(
                            switchMap(() => this.discord.sendReactionToMessage(message, EMOJIS.ERROR))
                        );
                    })
                );
            } else {
                return EMPTY;
            }
        } else if (isFromChannelAndCommand(CHANNELS.SESSIONS, COMMANDS.ATTENDANCE)) {
            return this.validateCurrentTime(TIMES.START_TIME, TIMES.END_TIME).pipe(
                switchMap(() => this.attendanceForDiscordId(discordId)),
                switchMap(() => this.discord.sendReactionToMessage(message, EMOJIS.CHECK)),
                catchError(error => {
                    console.warn('Operation Error', error);
                    return this.discord.sendErrorMessage(message, error).pipe(
                        switchMap(() => this.discord.sendReactionToMessage(message, EMOJIS.ERROR))
                    );
                })
            )
        } else if (isFromChannelAndCommand(CHANNELS.SESSIONS, COMMANDS.NEW_SESSION)) {
            const date = args[0];
            return this.createNewSession(date).pipe(
                switchMap(() => this.discord.sendReactionToMessage(message, EMOJIS.CHECK)),
                catchError(error => {
                    console.warn('Operation Error', error);
                    return this.discord.sendErrorMessage(message, error).pipe(
                        switchMap(() => this.discord.sendReactionToMessage(message, EMOJIS.ERROR))
                    );
                })
            )
        } else if (isFromChannelAndCommand(CHANNELS.SESSIONS, COMMANDS.HELP)) {
            return this.discord.sendMessageToChannel(channel, MESSAGES.HELP).pipe(
                switchMap(() => this.discord.sendReactionToMessage(message, EMOJIS.THUMBS_UP))
            );
        } else if (isFromChannelAndCommand(CHANNELS.SESSIONS, COMMANDS.TODAY)) {
            return this.getTodaysSession().pipe(
                map(session => JSON.stringify(session)),
                switchMap((session) => this.discord.sendMessageToChannel(channel, session))
            );
        } else {
            return EMPTY;
        }
    }

    private validateCurrentTime = (start: string, end: string): Observable<any> => {
        const isBetween = DateUtils.isBetween(start, end);
        if (isBetween) {
            return of(true);
        } else {
            return throwError(new AttendanceInvalidError())
        }
    }

    private getTodaysSession = (): Observable<Session> => {
        const today = DateUtils.getTodayAsString();
        return this.persistance.getSessionForDate(today);
    }

    private attendanceForDiscordId = (discordId: string): Observable<any> => {
        const today = DateUtils.getTodayAsString();
        return this.persistance.setAttendanceForDiscordId(discordId, today);
    }

    private registerDiscordId = (discordId: string, universityId: string): Observable<boolean> => {
        return this.persistance.putRegisteredStudent(discordId, universityId).pipe(mapTo(true));
    }

    private getDMChannelForDiscordId = (discordId: string): Observable<PrivateChannel> => {
        return this.discord.getDMChannelForDiscordId(discordId);
    }

    private createNewSession = (date: string): Observable<any> => {
        return this.persistance.createNewSession(date);
    }
}