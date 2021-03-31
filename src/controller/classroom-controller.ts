import {Message, PrivateChannel} from "eris";
import {EMPTY, Observable} from "rxjs";
import {COMMANDS} from "../constants";
import {switchMap} from "rxjs/operators";
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
import {handleErrorWithoutMessage, isAuthorAdmin} from "./commands/common-handlers";
import {MyAbsencesCommand} from "./commands/my-absences-command";
import {ParticipationCommand} from "./commands/participation-command";
import {DateUtils} from "../utils/date-utils";
import {SendTeacherNotificationsCommand} from "./commands/send-teacher-notifications-command";
import {ServerTimeCommand} from "./commands/server-time-command";
import {CommandUtils} from "../utils/command-utils";
import {ActivityCommand} from "./commands/activity-command";
import {ManualParticipationCommand} from "./commands/manual-participation-command";
import {ManualAttendanceCommand} from "./commands/manual-attendance-command";

export class ClassroomController {
    private persistence: PersistenceController = new PersistenceController(this.config.classes[0].code);
    private cron: CronController = new CronController();

    // Commands
    private registerCommand = new RegisterCommand(this.persistence, this.discord, this.config)
    private attendanceCommand = new AttendanceCommand(this.persistence, this.discord, this.config);
    private manualAttendanceCommand = new ManualAttendanceCommand(this.persistence, this.discord, this.config);
    private activityCommand = new ActivityCommand(this.persistence, this.discord, this.config);
    private newSessionCommand = new NewSessionCommand(this.persistence, this.discord, this.config);
    private newActivityCommand = new NewActivityCommand(this.persistence, this.discord, this.config);
    private participationCommand = new ParticipationCommand(this.persistence, this.discord, this.config);
    private manualParticipationCommand = new ManualParticipationCommand(this.persistence, this.discord, this.config);
    private helpCommand = new HelpCommand(this.discord, this.config);
    private serverTimeCommand = new ServerTimeCommand(this.discord, this.config);
    private todayCommand = new TodayCommand(this.persistence, this.discord);
    private sendClassNotifications = new SendClassNotificationsCommand(this.persistence, this.discord, this.config);
    private sendTeacherNotificationsCommand = new SendTeacherNotificationsCommand(this.persistence, this.discord, this.config);
    private myAbsencesCommand = new MyAbsencesCommand(this.persistence, this.discord, this.config);

    constructor(private config: Config, private discord: DiscordController) {
        // Class information at start / end
        this.cron.addTask(CronController.getCronTimeForHourMinute(this.config.classes[0].start_time), () => {
            this.todayCommand.executeWithoutMessage().pipe(
                switchMap(session => this.sendClassNotifications.sendStartClass(session.resources).pipe(
                    switchMap(() => this.sendTeacherNotificationsCommand.sendStartClass(session))
                ))
            ).subscribe(() => {
            }, handleErrorWithoutMessage);
        });
        this.cron.addTask(CronController.getCronTimeForHourMinute(this.config.classes[0].end_time), () => {
            this.sendClassNotifications.sendEndClass().subscribe(() => {
            }, handleErrorWithoutMessage);
        });

        // Attendance
        const attendanceWarning = DateUtils.getTimeXMinutesEarlierAsString(this.config.classes[0].attendance_end_time, 5);
        this.cron.addTask(CronController.getCronTimeForHourMinute(attendanceWarning), () => {
            this.sendClassNotifications.sendWarningAttendance(5).subscribe(() => {
            }, handleErrorWithoutMessage);
        });
        this.cron.addTask(CronController.getCronTimeForHourMinute(this.config.classes[0].attendance_end_time), () => {
            this.sendClassNotifications.sendEndAttendance().subscribe(() => {
            }, handleErrorWithoutMessage);
        });

        // Activities
        this.cron.addTask(CronController.getCronTimeForHourMinute(this.config.classes[0].end_time), () => {
            this.sendClassNotifications.sendTodaysActivityNotification().subscribe(() => {
            }, handleErrorWithoutMessage);
        });
        this.cron.addTask(CronController.getCronTimeForHourMinute('18:00'), () => {
            this.sendClassNotifications.sendTodaysActivityReminder().subscribe(() => {
            }, handleErrorWithoutMessage);
        });
    }

    processMessage(message: Message): Observable<any> {
        const isCommand = (content: string): boolean => {
            return content.startsWith('-');
        }
        if (!isCommand(message.content)) {
            return EMPTY;
        }
        const channelId = message.channel.id;
        const channel = message.channel;
        const discordId = message.author.id;
        const command = message.content.split(" ", 1)[0];
        const rawArgs = message.content.split(command + '')[1].trim();
        let args: string[];
        if (rawArgs && CommandUtils.isJson(rawArgs)) {
            args = JSON.parse(rawArgs);
        } else {
            if (rawArgs.indexOf(" ") > -1) {
                args = rawArgs.split(" ").map(t => t.toString());
            } else {
                args = [rawArgs.toString()];
            }
        }
        const isPrivate = (): boolean => {
            return channel instanceof PrivateChannel;
        }
        const isValidChannelId = (channel: string): boolean => {
            return (channelId === channel);
        }
        const isValidCommand = (commandToSearch: string): boolean => {
            return command.toLowerCase().startsWith(commandToSearch);
        }
        if (isPrivate() && isValidCommand(COMMANDS.REGISTER)) {
            return this.registerCommand.execute(message, args);
        } else if (isPrivate() && isValidCommand(COMMANDS.ATTENDANCE)) {
            return this.attendanceCommand.execute(message, args);
        } else if (isPrivate() && isValidCommand(COMMANDS.ACTIVITY)) {
            return this.activityCommand.execute(message, args);
        } else if (isValidChannelId(this.config.channels.participations) && isValidCommand(COMMANDS.PARTICIPATION)) {
            return this.participationCommand.execute(message, args);
        } else if (isPrivate() && isValidCommand(COMMANDS.MY_ABSENCES)) {
            return this.myAbsencesCommand.execute(message, args);
        } else if (isValidCommand(COMMANDS.HELP)) {
            return this.helpCommand.execute(message, args);
        } else if (isValidCommand(COMMANDS.TIME)) {
            return this.serverTimeCommand.execute(message, args);
        } else if (isValidCommand(COMMANDS.TODAY)) {
            return this.todayCommand.executeFromMessage(message, args);
        } else if (isAuthorAdmin(this.config, discordId) && isPrivate() && isValidCommand(COMMANDS.NEW_SESSION)) {
            return this.newSessionCommand.execute(message, args);
        } else if (isAuthorAdmin(this.config, discordId) && isPrivate() && isValidCommand(COMMANDS.NEW_ACTIVITY)) {
            return this.newActivityCommand.execute(message, args);
        } else if (isAuthorAdmin(this.config, discordId) && isPrivate() && isValidCommand(COMMANDS.MANUAL_PARTICIPATION)) {
            return this.manualParticipationCommand.execute(message, args);
        } else if (isAuthorAdmin(this.config, discordId) && isPrivate() && isValidCommand(COMMANDS.MANUAL_ATTENDANCE)) {
            return this.manualAttendanceCommand.execute(message, args);
        } else {
            return EMPTY;
        }
    }
}