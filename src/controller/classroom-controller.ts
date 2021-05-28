import {Message, PossiblyUncachedTextableChannel, PrivateChannel} from "eris";
import {EMPTY, Observable, of} from "rxjs";
import {COMMANDS, EMOJIS} from "../constants";
import {catchError, filter, switchMap} from "rxjs/operators";
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
import {handleError, handleErrorWithoutMessage, handleSuccess, isAuthorAdmin} from "./commands/common-handlers";
import {MyAbsencesCommand} from "./commands/my-absences-command";
import {ParticipationCommand} from "./commands/participation-command";
import {DateUtils} from "../utils/date-utils";
import {SendTeacherNotificationsCommand} from "./commands/send-teacher-notifications-command";
import {ServerTimeCommand} from "./commands/server-time-command";
import {CommandUtils} from "../utils/command-utils";
import {ActivityCommand} from "./commands/activity-command";
import {ManualParticipationCommand} from "./commands/manual-participation-command";
import {ManualAttendanceCommand} from "./commands/manual-attendance-command";
import {Logger} from "../utils/logger";
import {ManualActivityGradeCommand} from "./commands/manual-activity-grade-command";
import {TopsBottomsCommand} from "./commands/tops-bottoms-command";
import {SummaryCommand} from "./commands/summary-command";
import {ManualActivityCommand} from "./commands/manual-activity-command";
import {WhoisCommand} from "./commands/whois-command";
import {GradesOfCommand} from "./commands/grades-of-command";
import {GradesController} from "./grades-controller";
import {ManualExamGradeCommand} from "./commands/manual-exam-grade-command";
import {FileController} from "./file-controller";
import {InClassQuizCommand} from "./commands/in-class-quiz-command";
import {ExportReportCommand} from "./commands/export-report-command";
import {SendRandomMessageToStudentsCommand} from "./commands/send-random-message-to-students-command";

export class ClassroomController {
    private isUnderMaintenance = false;

    private persistence: PersistenceController = new PersistenceController(this.config);
    private fileController: FileController = new FileController(this.config);
    private cron: CronController = new CronController();

    // Commands
    private registerCommand = new RegisterCommand(this.persistence, this.discord, this.config)
    private attendanceCommand = new AttendanceCommand(this.persistence, this.discord, this.config);
    private manualAttendanceCommand = new ManualAttendanceCommand(this.persistence, this.discord, this.config);
    private manualActivityCommand = new ManualActivityCommand(this.persistence, this.discord, this.config);
    private manualExamGradeCommand = new ManualExamGradeCommand(this.persistence, this.discord, this.config);
    private manualActivityGradeCommand = new ManualActivityGradeCommand(this.persistence, this.discord, this.config);
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
    private topsBottomsCommand = new TopsBottomsCommand(this.persistence, this.discord, this.config);
    private summaryCommand = new SummaryCommand(this.persistence, this.fileController, this.discord, this.grades, this.config);
    private myAbsencesCommand = new MyAbsencesCommand(this.persistence, this.discord, this.config);
    private gradesOfCommand = new GradesOfCommand(this.persistence, this.fileController, this.discord, this.grades, this.config);
    private exportReportCommand = new ExportReportCommand(this.persistence, this.fileController, this.discord, this.grades, this.summaryCommand, this.gradesOfCommand, this.config);
    private whoisCommand = new WhoisCommand(this.persistence, this.discord, this.config);
    private inClassQuizCommand = new InClassQuizCommand(this.persistence, this.discord, this.grades, this.config);
    private sendRandom = new SendRandomMessageToStudentsCommand(this.persistence, this.discord, this.config);

    constructor(private config: Config, private discord: DiscordController, private grades: GradesController) {
        // Class information at start / end
        this.cron.addTask(CronController.getCronTimeForHourMinute(this.config.classes[0].start_time), () => {
            this.todayCommand.executeWithoutMessage().pipe(
                switchMap(session => this.sendClassNotifications.sendStartClass(session).pipe(
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

        // Reactions as participation commands
        this.discord.subscribeToReactions().pipe(
            filter(reaction => {
                return reaction.member.id === this.config.teacher.discordId &&
                    reaction.emoji.name === EMOJIS.CHECK &&
                    reaction.message.channel.id === this.config.channels.participations
            }),
            switchMap(reaction => this.discord.getMessageById(reaction.message.channel.id, reaction.message.id).pipe(
                switchMap(message => this.persistence.addParticipationForDiscordId(
                    message.author.id,
                    DateUtils.getTimestampAsDateString(message.createdAt))
                    .pipe(
                        switchMap(() => handleSuccess(this.discord, message)),
                        catchError(error => handleError(this.discord, message, error))
                    )),
            ))
        ).subscribe();

        // Reactions as grade commands
        this.discord.subscribeToReactions().pipe(
            filter(reaction => {
                return reaction.member.id === this.config.teacher.discordId &&
                    CommandUtils.getAvailableGradeReactions().some(e => e === reaction.emoji.name) &&
                    reaction.message.channel.id === this.config.channels.activities_presented
            }),
            switchMap(reaction => this.discord.getMessageById(reaction.message.channel.id, reaction.message.id).pipe(
                switchMap(message => this.persistence.addGradeToActivity(
                    CommandUtils.getDiscordIdFromEmbedMessage(message),
                    CommandUtils.getActivityFromEmbedMessage(message),
                    CommandUtils.getGradeFromReaction(reaction.emoji.name))
                    .pipe(
                        switchMap(() => handleSuccess(discord, message)),
                        catchError(error => handleError(discord, message, error))
                    )
                ),
            )),
            catchError(error => {
                Logger.error(error);
                return of(true)
            })
        ).subscribe();
    }

    processMessage(message: Message<PossiblyUncachedTextableChannel>): Observable<any> {
        const isCommand = (content: string): boolean => {
            return content.startsWith('-') && !!content.split('-')[1].trim();
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

        if (this.isUnderMaintenance && !isAuthorAdmin(this.config, discordId)) {
            return handleError(this.discord, message, "Bot is under maintenance temporarily")
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
        } else if (isPrivate() && isValidCommand(COMMANDS.MY_GRADES)) {
            return this.gradesOfCommand.execute(message, [discordId]);
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
        } else if (isAuthorAdmin(this.config, discordId) && isPrivate() && isValidCommand(COMMANDS.MANUAL_ACTIVITY_GRADE)) {
            return this.manualActivityGradeCommand.execute(message, args);
        } else if (isAuthorAdmin(this.config, discordId) && isPrivate() && isValidCommand(COMMANDS.MANUAL_ACTIVITY)) {
            return this.manualActivityCommand.execute(message, args);
        } else if (isAuthorAdmin(this.config, discordId) && isPrivate() && isValidCommand(COMMANDS.MANUAL_EXAM_GRADE)) {
            return this.manualExamGradeCommand.execute(message, args);
        } else if (isAuthorAdmin(this.config, discordId) && isPrivate() && isValidCommand(COMMANDS.TOPS_BOTTOMS)) {
            return this.topsBottomsCommand.execute(message, args);
        } else if (isAuthorAdmin(this.config, discordId) && isPrivate() && isValidCommand(COMMANDS.SEND_RANDOM)) {
            return this.sendRandom.execute(message, args);
        } else if (isAuthorAdmin(this.config, discordId) && isPrivate() && isValidCommand(COMMANDS.SUMMARY)) {
            return this.summaryCommand.execute(message, args);
        } else if (isAuthorAdmin(this.config, discordId) && isPrivate() && isValidCommand(COMMANDS.WHOIS)) {
            return this.whoisCommand.execute(message, args);
        } else if (isAuthorAdmin(this.config, discordId) && isPrivate() && isValidCommand(COMMANDS.GRADES_OF)) {
            return this.gradesOfCommand.execute(message, args);
        } else if (isAuthorAdmin(this.config, discordId) && isPrivate() && isValidCommand(COMMANDS.EXPORT_REPORT)) {
            return this.exportReportCommand.execute(message, args);
        } else if (isAuthorAdmin(this.config, discordId) && isPrivate() && isValidCommand(COMMANDS.IN_CLASS_QUIZ)) {
            return this.inClassQuizCommand.execute(message, args);
        } else {
            return EMPTY;
        }
    }
}
