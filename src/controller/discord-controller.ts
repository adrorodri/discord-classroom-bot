import {Observable, of, Subject, throwError} from "rxjs";
import * as eris from "eris";
import {EmbedField, Member, Message, MessageContent, PrivateChannel, Relationship, TextableChannel} from "eris";
import {fromPromise} from "rxjs/internal-compatibility";
import {mapTo} from "rxjs/operators";
import {InvalidUserStatusError} from "../errors/invalid-user-status.error";
import {Config} from "../model/config";

export class DiscordController {
    private client: eris.Client;
    private messagesSubject: Subject<Message> = new Subject<Message>();
    private membersStatus: Map<string, boolean> = new Map<string, boolean>();

    constructor(config: Config) {
        this.client = new eris.Client(config.bot_token);
        this.initClientEvents(config);
    }

    private initClientEvents(config: Config) {

        this.client.on('ready', () => {
            console.log('Connected and ready.');
            this.client.guilds.get(config.guildId)?.members?.forEach(member => {
                console.log(member.id, JSON.stringify(member.clientStatus));
                this.updateMemberStatus(member);
            })
        });

        this.client.on('error', err => {
            console.warn(err);
        });

        this.client.on('messageCreate', (msg) => {
            if (msg.author.id !== this.client.user.id) {
                this.messagesSubject.next(msg);
            }
        });

        this.client.on('presenceUpdate', (member, oldPresence) => {
            console.log(member.id, JSON.stringify(member.clientStatus));
            this.updateMemberStatus(member)
        });
    }

    private updateMemberStatus = (member: Member | Relationship) => {
        this.membersStatus.set(
            member.id,
            member.clientStatus?.desktop === 'online' &&
            member.clientStatus?.mobile === 'offline'
        );
    }

    public start(): Observable<any> {
        return fromPromise(this.client.connect());
    }

    public subscribeToMessages(): Observable<Message> {
        return this.messagesSubject;
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

    public sendPrivateMessageToUser(channel: PrivateChannel, message: string): Observable<Message> {
        return fromPromise(channel.createMessage(message));
    }

    public sendPrivateEmbedMessageToUser(channel: PrivateChannel, color: number, title: string, messageFields: EmbedField[]): Observable<Message> {
        const embedMessage: MessageContent = {
            embed: {
                title: title,
                color: color,
                timestamp: new Date(),
                fields: messageFields,
            }
        };
        return fromPromise(channel.createMessage(embedMessage));
    }

    public sendReactionToMessage(message: Message, emoji: string): Observable<Message> {
        return fromPromise(message.channel.addMessageReaction(message.id, emoji)).pipe(mapTo(message));
    }

    sendErrorMessage(message: Message, error: any) {
        return fromPromise(message.channel.createMessage("Error! " + error.toString()));
    }

    getDMChannelForDiscordId(discordId: string): Observable<PrivateChannel> {
        return fromPromise(this.client.getDMChannel(discordId));
    }

    validateIsUserOnlineFromDesktop(discordId: string, guildId: string): Observable<boolean> {
        return this.membersStatus.get(discordId) ? of(true) : throwError(new InvalidUserStatusError());
    }
}