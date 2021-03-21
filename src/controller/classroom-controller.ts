import {Message, PrivateChannel} from "eris";
import {EMPTY, Observable, of} from "rxjs";
import {COLORS, COMMANDS, DEFAULT_SESSION} from "../constants";
import {catchError, switchMap} from "rxjs/operators";
import {PersistenceController} from "./persistence-controller";
import {DiscordController} from "./discord-controller";
import {CronController} from "./cron-controller";
import {Config} from "../model/config";
import {RegisterCommand} from "./commands/register-command";
import {AttendanceCommand} from "./commands/attendance-command";
import {NewSessionCommand} from "./commands/new-session-command";
import {NewActivityCommand} from "./commands/new-activity-command";
import {HelpCommand} from "./commands/help-command";
import {TodayCommand} from "./commands/today-command";
import {Session} from "../model/session";
import {DateUtils} from "../utils/date-utils";

export class ClassroomController {
    private persistence: PersistenceController = new PersistenceController(this.config.classes[0].code);
    private cron: CronController = new CronController();

    // Commands
    private registerCommand = new RegisterCommand(this.persistence, this.discord)
    private attendanceCommand = new AttendanceCommand(this.persistence, this.discord, this.config);
    private newSessionCommand = new NewSessionCommand(this.persistence, this.discord);
    private newActivityCommand = new NewActivityCommand(this.persistence, this.discord, this.config);
    private helpCommand = new HelpCommand(this.discord);
    private todayCommand = new TodayCommand(this.persistence, this.discord);

    constructor(private config: Config, private discord: DiscordController) {
        this.cron.addTask(CronController.getCronTimeForHourMinute(this.config.classes[0].start_time), () => {
            this.getTodaysSession().pipe(
                catchError(error => of(DEFAULT_SESSION)),
                switchMap(session => {
                    const resources = session.resources || [];
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
                        }])
                })
            ).subscribe(() => {
            }, error => {
                console.error(error);
            })
        });
        this.cron.addTask(CronController.getCronTimeForHourMinute(this.config.classes[0].end_time), () => {
            this.discord.sendEmbedMessageToChannelId(this.config.channels.attendance, COLORS.INFO, 'La clase termino', []).subscribe(() => {
            }, error => {
                console.error(error);
            });
        });
    }

    processMessage(message: Message): Observable<any> {
        const channelId = message.channel.id;
        const command = message.content.split(" ", 1)[0];
        const args = message.content.split(command + '')[1].match(/(\w+\|(".+"))|[^\s]+/g) || [];
        const discordId = message.author.id;
        const isValidChannelId = (channel: string): boolean => {
            const isDmMessage = message.channel instanceof PrivateChannel;
            return (channelId === channel || isDmMessage);
        }
        const isValidCommand = (commandToSearch: string): boolean => {
            return command.toLowerCase().startsWith(commandToSearch);
        }
        const isValidAuthor = (): boolean => {
            return discordId === this.config.teacher.discordId;
        }
        if (isValidChannelId(this.config.channels.attendance) && isValidCommand(COMMANDS.REGISTER)) {
            return this.registerCommand.execute(message, discordId, args);
        } else if (isValidChannelId(this.config.channels.attendance) && isValidCommand(COMMANDS.ATTENDANCE)) {
            return this.attendanceCommand.execute(message, discordId, args);
        } else if (isValidChannelId(this.config.channels.attendance) && isValidCommand(COMMANDS.NEW_SESSION) && isValidAuthor()) {
            return this.newSessionCommand.execute(message, args);
        } else if (isValidChannelId(this.config.channels.attendance) && isValidCommand(COMMANDS.NEW_ACTIVITY) && isValidAuthor()) {
            return this.newActivityCommand.execute(message, args);
        } else if (isValidChannelId(this.config.channels.attendance) && isValidCommand(COMMANDS.HELP)) {
            return this.helpCommand.execute(message, args);
        } else if (isValidChannelId(this.config.channels.attendance) && isValidCommand(COMMANDS.TODAY)) {
            return this.todayCommand.execute(message, args);
        } else {
            return EMPTY;
        }
    }

    private getTodaysSession = (): Observable<Session> => {
        const today = DateUtils.getTodayAsString();
        return this.persistence.getSessionForDate(today);
    }
}