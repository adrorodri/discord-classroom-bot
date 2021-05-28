import {catchError, first, switchMap, tap} from "rxjs/operators";
import {Observable, of, throwError} from "rxjs";
import {PersistenceController} from "../persistence-controller";
import {handleError, handleSuccess} from "./common-handlers";
import {DiscordController} from "../discord-controller";
import {Message, PossiblyUncachedTextableChannel} from "eris";
import {Config} from "../../model/config";
import {MessageWithoutContentError} from "../../errors/message-without-content.error";
import {QuizError} from "../../errors/quiz.error";

export class SendRandomMessageToStudentsCommand {

    constructor(private persistence: PersistenceController,
                private discord: DiscordController,
                private config: Config) {
    }

    execute(message: Message<PossiblyUncachedTextableChannel>, args: string[]): Observable<boolean> {
        if (!args || !args.length) {
            return throwError(new MessageWithoutContentError());
        }
        try {
            return of(this.discord.getOnlineStudents(this.config)).pipe(
                tap(onlineStudents => {
                    if (!onlineStudents.length) {
                        throw new QuizError('No students online to send messages!')
                    }
                }),
                tap(onlineStudents => onlineStudents.forEach(student => {
                    const randomMessage = args[Math.floor(Math.random() * args.length)];
                    this.sendMessageToUser(student, randomMessage);
                })),
                switchMap(onlineStudents => this.discord.sendMessageToChannelId(
                    message.channel.id,
                    `Sent messages to:\n${onlineStudents.map(s => this.discord.getNameForDiscordId(s)).join('\n')}`
                )),
                switchMap(() => handleSuccess(this.discord, message)),
                catchError(error => handleError(this.discord, message, error))
            );
        } catch (e) {
            return throwError(e);
        }
    }

    private sendMessageToUser(discordId: string, message: string) {
        this.discord.getDMChannelForDiscordId(discordId).pipe(
            switchMap(dmChannelId => this.discord.sendMessageToChannelId(dmChannelId, message)),
            first()
        ).subscribe(() => {
        }, () => {
        })
    }
}
