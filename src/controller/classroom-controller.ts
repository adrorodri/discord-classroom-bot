import {Message, PrivateChannel} from "eris";
import {EMPTY, Observable, of} from "rxjs";
import {COMMANDS, DEFAULT_SESSION} from "../constants";
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
import {SendClassNotificationsCommand} from "./commands/send-class-notifications-command";
import {handleErrorWithoutMessage} from "./commands/common-handlers";

export class ClassroomController {
    private persistence: PersistenceController = new PersistenceController(this.config.classes[0].code);
    private cron: CronController = new CronController();

    // Commands
    private registerCommand = new RegisterCommand(this.persistence, this.discord, this.config)
    private attendanceCommand = new AttendanceCommand(this.persistence, this.discord, this.config);
    private newSessionCommand = new NewSessionCommand(this.persistence, this.discord, this.config);
    private newActivityCommand = new NewActivityCommand(this.persistence, this.discord, this.config);
    private helpCommand = new HelpCommand(this.discord);
    private todayCommand = new TodayCommand(this.persistence, this.discord);
    private sendClassNotifications = new SendClassNotificationsCommand(this.persistence, this.discord, this.config);

    constructor(private config: Config, private discord: DiscordController) {
        this.cron.addTask(CronController.getCronTimeForHourMinute(this.config.classes[0].start_time), () => {
            this.todayCommand.executeWithoutMessage().pipe(
                switchMap(session => this.sendClassNotifications.executeStartClass(session.resources))
            ).subscribe(() => {
            }, handleErrorWithoutMessage);
        });
        this.cron.addTask(CronController.getCronTimeForHourMinute(this.config.classes[0].end_time), () => {
            this.sendClassNotifications.executeEndClass().subscribe(() => {
            }, handleErrorWithoutMessage);
        });
    }

    processMessage(message: Message): Observable<any> {
        const channelId = message.channel.id;
        const command = message.content.split(" ", 1)[0];
        const args = message.content.split(command + '')[1].match(/(\w+\|(".+"))|[^\s]+/g) || [];
        const isValidChannelId = (channel: string): boolean => {
            const isDmMessage = message.channel instanceof PrivateChannel;
            return (channelId === channel || isDmMessage);
        }
        const isValidCommand = (commandToSearch: string): boolean => {
            return command.toLowerCase().startsWith(commandToSearch);
        }
        if (isValidChannelId(this.config.channels.attendance) && isValidCommand(COMMANDS.REGISTER)) {
            return this.registerCommand.execute(message, args);
        } else if (isValidChannelId(this.config.channels.attendance) && isValidCommand(COMMANDS.ATTENDANCE)) {
            return this.attendanceCommand.execute(message, args);
        } else if (isValidChannelId(this.config.channels.attendance) && isValidCommand(COMMANDS.NEW_SESSION)) {
            return this.newSessionCommand.execute(message, args);
        } else if (isValidChannelId(this.config.channels.attendance) && isValidCommand(COMMANDS.NEW_ACTIVITY)) {
            return this.newActivityCommand.execute(message, args);
        } else if (isValidChannelId(this.config.channels.attendance) && isValidCommand(COMMANDS.HELP)) {
            return this.helpCommand.execute(message, args);
        } else if (isValidChannelId(this.config.channels.attendance) && isValidCommand(COMMANDS.TODAY)) {
            return this.todayCommand.executeFromMessage(message, args);
        } else {
            return EMPTY;
        }
    }
}