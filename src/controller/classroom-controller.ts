import {DateUtils} from "../utils/date-utils";
import {Message, PrivateChannel} from "eris";
import {EMPTY, Observable, of, throwError} from "rxjs";
import {CHANNELS, COLORS, COMMANDS, DEFAULT_SESSION, EMOJIS, MESSAGES, TIMES} from "../constants";
import {catchError, map, mapTo, switchMap} from "rxjs/operators";
import {PersistanceController} from "./persistance-controller";
import {DiscordController} from "./discord-controller";
import {Resource, Session} from "../model/session";
import {AttendanceInvalidError} from "../errors/attendance-invalid.error";
import {CronController} from "./cron-controller";

export class ClassroomController {
    private persistance: PersistanceController;
    private cron: CronController;

    constructor(classId: string, private discord: DiscordController) {
        this.persistance = new PersistanceController(classId);
        this.cron = new CronController();

        this.cron.addTask(CronController.getCronTimeForHourMinute(TIMES.START_TIME), () => {
            this.getTodaysSession().pipe(
                catchError(error => of(DEFAULT_SESSION)),
                switchMap(session => this.discord.sendEmbedMessageToChannelId(
                    CHANNELS.SESSIONS.ID,
                    COLORS.INFO,
                    'La clase esta por comenzar',
                    [...session.resources, {
                        name: 'Unirse al canal:',
                        value: this.discord.getChannelNameForId(CHANNELS.VOICE_CLASSES.ID)
                    }, {
                        name: 'Mandar el attendance a:',
                        value: this.discord.getChannelNameForId(CHANNELS.SESSIONS.ID)
                    }]))
            ).subscribe(() => {
            }, error => {
                console.error(error);
            })
        });
        this.cron.addTask(CronController.getCronTimeForHourMinute(TIMES.END_TIME), () => {
            this.discord.sendEmbedMessageToChannelId(CHANNELS.SESSIONS.ID, COLORS.INFO, 'La clase termino', []).subscribe(() => {
            }, error => {
                console.error(error);
            });
        });
    }

    processMessage(message: Message): Observable<any> {
        const channel = message.channel;
        const channelId = message.channel.id;
        const content = message.content.split(" ")[0];
        const args = message.content.split(" ").slice(1);
        const discordId = message.author.id;
        const isValidChannelId = (channel: string): boolean => {
            const isDmMessage = message.channel instanceof PrivateChannel;
            return (channelId === channel || isDmMessage);
        }
        const isValidCommand = (command: string): boolean => {
            return content.toLowerCase().startsWith(command);
        }
        const handleError = (error): Observable<any> => {
            console.warn('Operation Error', error);
            return this.discord.sendErrorMessage(message, error).pipe(
                switchMap(() => this.discord.sendReactionToMessage(message, EMOJIS.ERROR))
            );
        }
        if (isValidChannelId(CHANNELS.SESSIONS.ID) && isValidCommand(COMMANDS.REGISTER)) {
            const universityId = args[1];
            if (universityId) {
                return this.registerDiscordId(discordId, universityId).pipe(
                    switchMap(() => this.discord.getDMChannelForDiscordId(discordId)),
                    switchMap(channel => this.discord.sendPrivateMessageToUser(channel, 'Registrado correctamente!')),
                    switchMap(() => this.discord.sendReactionToMessage(message, EMOJIS.CHECK)),
                    catchError(handleError)
                );
            } else {
                return EMPTY;
            }
        } else if (isValidChannelId(CHANNELS.SESSIONS.ID) && isValidCommand(COMMANDS.ATTENDANCE)) {
            return this.validateCurrentTime(TIMES.START_TIME, TIMES.END_TIME).pipe(
                switchMap(() => this.attendanceForDiscordId(discordId)),
                switchMap(() => this.discord.sendReactionToMessage(message, EMOJIS.CHECK)),
                catchError(handleError)
            )
        } else if (isValidChannelId(CHANNELS.SESSIONS.ID) && isValidCommand(COMMANDS.NEW_SESSION)) {
            const date = args[0];
            const resources = args.slice(1);
            return this.createNewSession(date, resources).pipe(
                switchMap(() => this.discord.sendReactionToMessage(message, EMOJIS.CHECK)),
                catchError(handleError)
            )
        } else if (isValidChannelId(CHANNELS.SESSIONS.ID) && isValidCommand(COMMANDS.HELP)) {
            return this.discord.sendMessageToChannel(channel, MESSAGES.HELP).pipe(
                switchMap(() => this.discord.sendReactionToMessage(message, EMOJIS.THUMBS_UP))
            );
        } else if (isValidChannelId(CHANNELS.SESSIONS.ID) && isValidCommand(COMMANDS.TODAY)) {
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

    private createNewSession = (date: string, resources: string[] = []): Observable<any> => {
        const parsedResources = resources.map(resource => {
            return <Resource>{
                name: resource.split("|")[0],
                value: resource.split("|")[1]
            }
        });
        return this.persistance.createNewSession(date, parsedResources);
    }
}