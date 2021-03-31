import {catchError, switchMap, tap} from "rxjs/operators";
import {Observable, of, throwError} from "rxjs";
import {PersistenceController} from "../persistence-controller";
import {handleError, handleSuccess} from "./common-handlers";
import {DiscordController} from "../discord-controller";
import {Attachment, Message} from "eris";
import {Config} from "../../model/config";
import {DateUtils} from "../../utils/date-utils";
import {COLORS} from "../../constants";
import {ParticipationInvalidError} from "../../errors/participation-invalid.error";
import {ActivityAlreadyPresentedError} from "../../errors/activity-already-presented.error";
import {MessageWithoutContentError} from "../../errors/message-without-content.error";

export class ActivityCommand {
    constructor(private persistence: PersistenceController, private discord: DiscordController, private config: Config) {
    }

    execute(message: Message, args: string[]): Observable<boolean> {
        const today = DateUtils.getTodayAsString();
        const hasAttachments = message.attachments.length;
        const attachments = message.attachments;
        const discordId = message.author.id;
        const channel = message.channel;
        return this.validateCurrentTime(this.config.classes[0].end_time, '23:59').pipe(
            switchMap(() => this.validateMessageContents(attachments, args)),
            switchMap(() => this.persistence.getActivityForDate(today)),
            switchMap(() => this.validateUserDidntPresentActivityYet(discordId, today)),
            switchMap(() => this.persistence.addActivityPresentationToDiscordId(
                discordId,
                today,
                hasAttachments ? attachments[0].url : args.join(' ') || '')
            ),
            switchMap(() => this.discord.sendEmbedMessageToChannelId(
                this.config.channels.activities_presented,
                COLORS.SUCCESS,
                `${this.discord.getNameForDiscordId(discordId) || discordId}`,
                [
                    ...attachments.map(a => {
                        return {
                            name: 'attachment',
                            value: a.url
                        }
                    }),
                    {
                        name: 'raw-content',
                        value: args.join(' ') || ''
                    },
                    {
                        name: 'discordId',
                        value: discordId
                    },
                    {
                        name: 'Activity',
                        value: today
                    },
                    {
                        name: 'Time',
                        value: DateUtils.nowString()
                    }
                ]
            )),
            switchMap(() => handleSuccess(this.discord, message)),
            switchMap(() => this.discord.sendMessageToChannel(channel, 'Actividad registrada correctamente!')),
            catchError(error => handleError(this.discord, message, error))
        )
    }

    private validateMessageContents = (attachments: Attachment[], args: string[]): Observable<any> => {
        if (attachments.length || args.length) {
            return of(true);
        }
        return throwError(new MessageWithoutContentError())
    }

    private validateUserDidntPresentActivityYet = (discordId: string, date: string): Observable<any> => {
        return this.persistence.getActivitiesForDiscordId(discordId).pipe(
            tap(activities => {
                if (activities.some(a => a.activity === date)) {
                    throw new ActivityAlreadyPresentedError();
                }
            })
        )
    }

    private validateCurrentTime = (start: string, end: string): Observable<any> => {
        const isBetween = DateUtils.isBetween(start, end);
        if (isBetween) {
            return of(true);
        } else {
            return throwError(new ParticipationInvalidError())
        }
    }
}