import {Observable, Subject} from "rxjs";
import * as eris from "eris";
import {EmbedField, Message, MessageContent, PrivateChannel, TextableChannel} from "eris";
import {fromPromise} from "rxjs/internal-compatibility";
import {mapTo} from "rxjs/operators";

export class DiscordController {
    private client: eris.Client;
    private messagesSubject: Subject<Message> = new Subject<Message>();

    constructor(token: string) {
        this.client = new eris.Client(token);
        this.initClientEvents();
    }

    private initClientEvents() {

        this.client.on('ready', () => {
            console.log('Connected and ready.');
        });

        this.client.on('error', err => {
            console.warn(err);
        });

        this.client.on('messageCreate', (msg) => {
            if (msg.author.id !== this.client.user.id) {
                this.messagesSubject.next(msg);
            }
        });
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
}