import {
    catchError,
    concatMap,
    filter,
    first,
    flatMap,
    map,
    switchMap,
    takeWhile,
    tap,
    timeout,
    toArray
} from "rxjs/operators";
import {interval, Observable, of, throwError, TimeoutError} from "rxjs";
import {PersistenceController} from "../persistence-controller";
import {handleError, handleSuccess} from "./common-handlers";
import {DiscordController} from "../discord-controller";
import {Message, PossiblyUncachedTextableChannel} from "eris";
import {Config} from "../../model/config";
import {MessageWithoutContentError} from "../../errors/message-without-content.error";
import {GradesController} from "../grades-controller";
import {QuizQuestion} from "../../model/quiz-question";
import {DIVIDER, EMOJIS} from "../../constants";
import {DateUtils} from "../../utils/date-utils";
import {QuizError} from "../../errors/quiz.error";

export class InClassQuizCommand {

    constructor(private persistence: PersistenceController,
                private discord: DiscordController,
                private gradesController: GradesController,
                private config: Config) {
    }

    execute(message: Message<PossiblyUncachedTextableChannel>, args: string[]): Observable<boolean> {
        if (!args || !args.length) {
            return throwError(new MessageWithoutContentError());
        }
        try {
            const quizName = args[0];
            const date = args[1];
            const maxParticipations = Number(args[2].trim());
            const questions: QuizQuestion[] = args.slice(3).map((str, index) => {
                const fields = str.split('|');
                return {
                    id: (index + 1).toString(),
                    content: fields[0],
                    maxTime: 30000,
                    availableAnswers: fields[1].split(' ').filter(emoji => !!emoji),
                    correctAnswer: fields[2].trim()
                }
            });
            return of(this.discord.getOnlineStudents(this.config).filter(studentId => studentId !== this.config.teacher.discordId)).pipe(
                tap(onlineStudents => {
                    if (!onlineStudents.length) {
                        throw new QuizError('No students online to start the quiz!')
                    }
                }),
                tap(onlineStudents => onlineStudents.forEach(student => this.initQuizForDiscordId(message, quizName, date, student, questions, maxParticipations))),
                switchMap(onlineStudents => this.discord.sendMessageToChannelId(
                    message.channel.id,
                    `Initializing Quiz for:\n${onlineStudents.map(s => this.discord.getNameForDiscordId(s)).join('\n')}`
                )),
                switchMap(() => handleSuccess(this.discord, message)),
                catchError(error => handleError(this.discord, message, error))
            );
        } catch (e) {
            return throwError(e);
        }
    }

    private initQuizForDiscordId(originalMessage: Message<PossiblyUncachedTextableChannel>, quizName: string, date: string, discordId: string, questions: QuizQuestion[], maxParticipations: number) {
        let dmChannelId;
        let correctAnswers = 0;
        let participationsToAdd = 0;
        this.discord.getDMChannelForDiscordId(discordId).pipe(
            tap(channel => dmChannelId = channel),
            switchMap(() => this.discord.sendMessageToChannelId(dmChannelId, `Comenzó el Quiz ${quizName}!\nAtento a las preguntas! Responde con las opciones que aparecen en la parte inferior de cada mensaje, Tienes un tiempo limitado ${EMOJIS.CLOCK}!`).pipe(
                switchMap(message => this.discord.sendReactionsToMessage(message, [EMOJIS.CHECK, EMOJIS.CLOCK, EMOJIS.DINOSAUR])),
                switchMap(message => this.discord.subscribeToReactions().pipe(
                    filter(reaction =>
                        reaction.member.id !== this.discord.getBotId() &&
                        reaction.message.id === message.id &&
                        [EMOJIS.CHECK, EMOJIS.CLOCK, EMOJIS.DINOSAUR].some(e => e === reaction.emoji.name)
                    ),
                    first(),
                    switchMap(() => this.discord.sendTemporaryMessage(dmChannelId, "Muy bien! empecemos!")),
                    switchMap(() => this.discord.sendTemporaryMessage(dmChannelId, "3...")),
                    switchMap(() => this.discord.sendTemporaryMessage(dmChannelId, "2...")),
                    switchMap(() => this.discord.sendTemporaryMessage(dmChannelId, "1..."))
                )),
            )),
            flatMap(() => questions),
            concatMap(question => {
                let questionPending = true;
                const messageContent = `${DIVIDER}\nPregunta ${question.id}/${questions.length} | Tiempo: ->${question.maxTime / 1000}<-\n**${question.content}**\n${DIVIDER}`;
                return this.discord.sendMessageToChannelId(dmChannelId, messageContent).pipe(
                    switchMap(message => this.discord.sendReactionsToMessage(message, question.availableAnswers).pipe(
                        // TODO: TEST PERFORMANCE IN PROD
                        tap(() => interval(1000).pipe(
                            switchMap(counter => {
                                const newMessageContent = messageContent.replace(/->(.*)<-/, `->${(question.maxTime / 1000) - counter - 1}<-`)
                                return this.discord.editMessage(message, newMessageContent)
                            }), takeWhile(() => questionPending)).subscribe()
                        ),
                    )),
                    switchMap(message => this.discord.subscribeToReactions().pipe(
                        filter(reaction =>
                            reaction.member.id !== this.discord.getBotId() &&
                            reaction.message.id === message.id &&
                            question.availableAnswers.some(e => e === reaction.emoji.name)
                        ),
                        first(),
                        map(reaction => reaction.emoji.name === question.correctAnswer),
                        tap(correctAnswer => {
                            questionPending = false;
                            if (correctAnswer) {
                                correctAnswers += 1;
                            }
                        }),
                        switchMap(correctAnswer => correctAnswer ?
                            this.discord.sendMessageToChannelId(dmChannelId, "Respuesta correcta!") :
                            this.discord.sendMessageToChannelId(dmChannelId, `Respuesta incorrecta!\nLa respuesta correcta es: ${question.correctAnswer}`)
                        )
                    )),
                    timeout(question.maxTime),
                    catchError(error => {
                        questionPending = false;
                        if (error instanceof TimeoutError) {
                            return this.discord.sendMessageToChannelId(dmChannelId, `Timeout!\nLa respuesta correcta es: ${question.correctAnswer}`);
                        } else {
                            return of(true);
                        }
                    })
                )
            }),
            toArray(),
            tap(() => {
                participationsToAdd = Math.round((correctAnswers / questions.length) * maxParticipations);
            }),
            switchMap(() => this.discord.sendMessageToChannelId(dmChannelId, `${DIVIDER}\nEl quiz terminó!\n**Tu score: ${correctAnswers}/${questions.length}**\nParticipaciones ganadas: ${participationsToAdd}\n${DIVIDER}`)),
            switchMap(() => this.persistence.addMultipleParticipationForDiscordId(participationsToAdd, discordId, date)),
            switchMap(() => participationsToAdd > 0 ?
                this.discord.sendMessageToChannelId(dmChannelId, `${participationsToAdd} participaciones han sido agregadas para hoy! ${EMOJIS.CHECK}`) :
                of(true)
            ),
            switchMap(() => this.discord.sendMessageToChannelId(originalMessage.channel.id, `${this.discord.getNameForDiscordId(discordId)} -> ${correctAnswers}/${questions.length} -> ${participationsToAdd} participaciones`)),
            catchError(error => handleError(this.discord, originalMessage, error))
        ).subscribe(() => {
        }, () => {
        })
    }
}
