import {Observable, of, Subject, throwError} from "rxjs";
import * as eris from "eris";
import {
    EmbedField,
    Emoji,
    Member,
    Message,
    MessageContent,
    PossiblyUncachedMessage,
    Relationship,
    TextableChannel
} from "eris";
import {fromPromise} from "rxjs/internal-compatibility";
import {mapTo} from "rxjs/operators";
import {InvalidUserStatusError} from "../errors/invalid-user-status.error";
import {Config} from "../model/config";
import {NotRegisteredError} from "../errors/not-registered.error";
import {COLORS} from "../constants";
import {Logger} from "../utils/logger";

export class DiscordController {
    private client: eris.Client;
    private messagesSubject: Subject<Message> = new Subject<Message>();
    private reactionsSubject: Subject<{ message: PossiblyUncachedMessage, emoji: Emoji, member: Member | { id: string } }> = new Subject();
    private membersStatus: Map<string, boolean> = new Map<string, boolean>();
    private memberNames: Map<string, string> = new Map<string, string>();
    private privateDMChannels: Map<string, string> = new Map<string, string>();

    constructor(config: Config) {
        this.client = new eris.Client(config.bot_token);
        this.initClientEvents(config);
    }

    private initClientEvents(config: Config) {

        this.client.on('ready', () => {
            Logger.log('Connected and ready.');
            this.client.guilds.get(config.guildId)?.members?.filter(member => !member.user.bot)?.forEach(member => {
                Logger.log(member.id, JSON.stringify(member.clientStatus));
                this.updateMemberStatus(member);
                this.updateMemberName(member);
                this.updateMemberDMChannel(member);
            })
        });

        this.client.on('error', err => {
            Logger.warn(err);
        });

        this.client.on('messageCreate', (msg) => {
            if (msg.author.id !== this.client.user.id) {
                this.messagesSubject.next(msg);
            }
        });


        this.client.on('messageReactionAdd', (msg, emoji, member) => {
            if (msg.id !== this.client.user.id) {
                this.reactionsSubject.next({
                    message: msg,
                    emoji: emoji,
                    member: member
                });
            }
        });

        this.client.on('presenceUpdate', (member, oldPresence) => {
            this.updateMemberStatus(member);
            this.updateMemberName(member);
        });

        this.client.on('guildMemberAdd', async (guild, member) => {
            await this.updateMemberDMChannel(member);
            await this.sendWelcomeMessageToUser(member);
        });
    }

    private updateMemberStatus = (member: Member | Relationship) => {
        if (!member || !member.clientStatus) {
            return;
        }
        this.membersStatus.set(
            member.id,
            member.clientStatus?.desktop === 'online' &&
            member.clientStatus?.mobile === 'offline'
        );
    }

    private updateMemberName = (member: Member | Relationship) => {
        if (!member || !member.user.username) {
            return;
        }
        this.memberNames.set(
            member.id,
            member.user.username
        );
    }

    private updateMemberDMChannel = async (member: Member) => {
        const dmChannel = await this.client.getDMChannel(member.id);
        this.privateDMChannels.set(
            member.id,
            dmChannel.id
        );
    }

    private sendWelcomeMessageToUser = async (member: Member) => {
        const dmChannel = await this.client.getDMChannel(member.id);
        const embedMessage: MessageContent = {
            embed: {
                title: "Bienvenido a Programacion 3!",
                description: "Soy el bot de la clase, te ayudaré con las asistencias y tus participaciones\n\n" +
                    "Para comenzar, manda el comando: \n" +
                    "-register <CODIGO-UPB>      (Por ejemplo, -register 12345)",
                color: COLORS.SUCCESS,
                timestamp: new Date(),
                fields: [
                    {
                        name: 'Para ver la lista de comandos disponibles:',
                        value: '-help'
                    }
                ],
            }
        };
        await dmChannel.createMessage(embedMessage);
    }

    public start(): Observable<any> {
        return fromPromise(this.client.connect());
    }

    public subscribeToMessages(): Observable<Message> {
        return this.messagesSubject;
    }

    public subscribeToReactions(): Observable<{ message: PossiblyUncachedMessage, emoji: Emoji, member: Member | { id: string } }> {
        return this.reactionsSubject;
    }

    getChannelNameForId(channelId: string): string {
        return this.client.getChannel(channelId).mention
    }

    public sendMessageToChannel(channel: TextableChannel, message: string): Observable<Message> {
        return fromPromise(channel.createMessage(message));
    }

    public sendMessageToChannelId(channelId: string, message: string): Observable<Message> {
        return fromPromise((this.client.getChannel(channelId) as TextableChannel).createMessage(message));
    }

    public sendEmbedMessageToChannelId(channelId: string, color: number, title: string, messageFields: EmbedField[]): Observable<Message> {
        const embedMessage: MessageContent = {
            embed: {
                title: title,
                color: color,
                timestamp: new Date(),
                fields: messageFields,
            }
        };
        return fromPromise((this.client.getChannel(channelId) as TextableChannel).createMessage(embedMessage));
    }

    public sendReactionToMessage(message: Message, emoji: string): Observable<Message> {
        return fromPromise(message.channel.addMessageReaction(message.id, emoji)).pipe(mapTo(message));
    }

    sendErrorMessage(message: Message, error: any) {
        return fromPromise(message.channel.createMessage(error.toString()));
    }

    getDMChannelForDiscordId(discordId: string): Observable<string> {
        const channelId = this.privateDMChannels.get(discordId);
        if (channelId) {
            return of(channelId);
        } else {
            return throwError(new NotRegisteredError());
        }
    }

    validateIsUserOnlineFromDesktop(discordId: string, guildId: string): Observable<boolean> {
        return this.membersStatus.get(discordId) ? of(true) : throwError(new InvalidUserStatusError());
    }

    getNameForDiscordId(discordId: string): string | undefined {
        return this.memberNames.get(discordId);
    }
}