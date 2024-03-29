import {Observable, of, Subject, throwError} from "rxjs";
import * as eris from "eris";
import {
  ClientStatus,
  EmbedField,
  Member,
  Message,
  MessageContent,
  PartialEmoji,
  PossiblyUncachedMessage,
  PossiblyUncachedTextableChannel,
  Relationship,
  TextableChannel,
  VoiceChannel
} from "eris";
import {fromPromise} from "rxjs/internal-compatibility";
import {delay, mapTo, switchMap} from "rxjs/operators";
import {InvalidUserStatusError} from "../errors/invalid-user-status.error";
import {Config} from "../model/config";
import {NotRegisteredError} from "../errors/not-registered.error";
import {COLORS, COMMANDS, EMOJIS} from "../constants";
import {Logger} from "../utils/logger";

export class DiscordController {
  private client: eris.Client;
  private onInitializedResolve: any;
  public onInitialized = new Promise<Map<string, string>>((resolve) => {
    this.onInitializedResolve = resolve;
  });
  private messagesSubject: Subject<Message<PossiblyUncachedTextableChannel>> = new Subject<Message<PossiblyUncachedTextableChannel>>();
  private reactionsSubject: Subject<{ message: PossiblyUncachedMessage, emoji: PartialEmoji, member: Member | { id: string } }> = new Subject();
  private presenceSubject: Subject<Member | Relationship> = new Subject();
  private membersStatus: Map<string, ClientStatus | undefined> = new Map<string, ClientStatus | undefined>();
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
        Logger.log("Initializing member:", member.id, JSON.stringify(member.clientStatus));
        this.updateMemberStatus(member);
        this.updateMemberName(member);
        this.updateMemberDMChannel(member);
        this.onInitializedResolve(this.memberNames);
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
      this.presenceSubject.next(member);
    });

    this.client.on('guildMemberAdd', async (guild, member) => {
      if (member.bot) {
        return;
      }
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
      member.clientStatus
    );
  }

  private updateMemberName = (member: Member | Relationship) => {
    if (!member || !member.user.username) {
      return;
    }
    if (member instanceof Member) {
      this.memberNames.set(
        member.id,
        member.nick || member.username
      );
    } else {
      this.memberNames.set(
        member.id,
        member.user.username
      );
    }
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
        title: `Bienvenid@ a Programacion 3! ${EMOJIS.CHECK}`,
        description: `Soy el bot de la clase, te ayudaré con tus asistencias, tus participaciones y mucho mas!\n\n` +
          `Puedes explorar los comandos disponibles enviándome el comando -ayuda\n\n\n` +
          `Para comenzar, debes registrarte conmigo, simplemente mándame el comando: \n` +
          `-registrar <CODIGO-UPB>\n\nPor ejemplo:\n-registrar 12345`,
        color: COLORS.SUCCESS,
        timestamp: new Date(),
        fields: [
          {
            name: 'Para ver la lista de comandos disponibles:',
            value: COMMANDS.HELP
          },
          {
            name: 'Para registrarte en la materia:',
            value: `${COMMANDS.REGISTER} <CODIGO-UPB>`
          }
        ],
      }
    };
    await dmChannel.createMessage(embedMessage);
  }

  public start(): Observable<any> {
    return fromPromise(this.client.connect());
  }

  public subscribeToMessages(): Observable<Message<PossiblyUncachedTextableChannel>> {
    return this.messagesSubject;
  }

  public subscribeToReactions(): Observable<{ message: PossiblyUncachedMessage, emoji: PartialEmoji, member: Member | { id: string } }> {
    return this.reactionsSubject;
  }

  public subscribeToPresence(): Observable<Member | Relationship> {
    return this.presenceSubject;
  }

  public getMessageById(channelId: string, messageId: string): Observable<Message> {
    return fromPromise(this.client.getMessage(channelId, messageId))
  }

  public getChannelNameForId(channelId: string): string {
    return this.client.getChannel(channelId).mention
  }

  public sendMessageToChannel(channel: PossiblyUncachedTextableChannel, message: string): Observable<Message> {
    return fromPromise(this.client.createMessage(channel.id, message));
  }

  public sendMessageToChannelId(channelId: string, message: string): Observable<Message> {
    return fromPromise((this.client.getChannel(channelId) as TextableChannel).createMessage(message));
  }

  public sendFileToChannelId(channelId: string, message: string, file: Buffer, fileName: string): Observable<Message> {
    return fromPromise((this.client.getChannel(channelId) as TextableChannel).createMessage(message, {
      name: fileName,
      file: file
    }));
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

  public sendTemporaryMessage(channelId: string, temporaryMessage: string, messageTimeOfLife: number = 1000) {
    return this.sendMessageToChannelId(channelId, temporaryMessage).pipe(
      delay(messageTimeOfLife),
      switchMap(message => fromPromise(message.delete('Message timed out')))
    );
  }

  public sendReactionToMessage(message: Message<PossiblyUncachedTextableChannel>, emoji: string): Observable<Message<PossiblyUncachedTextableChannel>> {
    return fromPromise(this.client.addMessageReaction(message.channel.id, message.id, emoji)).pipe(mapTo(message));
  }

  public sendReactionsToMessage(message: Message, emojis: string[]): Observable<Message> {
    return fromPromise(emojis.reduce((promiseChain, emoji) => {
      return promiseChain.then(() => message.channel.addMessageReaction(message.id, emoji))
    }, Promise.resolve())).pipe(mapTo(message));
  }

  sendErrorMessage(message: Message<PossiblyUncachedTextableChannel>, error: any) {
    return fromPromise(this.client.createMessage(message.channel.id, error.toString()));
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
    const clientStatus = this.membersStatus.get(discordId);
    return clientStatus?.desktop === 'online' && clientStatus?.mobile === 'offline' ? of(true) : throwError(new InvalidUserStatusError());
  }

  getNameForDiscordId(discordId: string): string | undefined {
    return this.memberNames.get(discordId);
  }

  getOnlineStudents(config: Config): string[] {
    return (this.client.guilds.get(config.guildId)?.channels.get(config.channels.main_voice) as VoiceChannel)?.voiceMembers.map(m => m.id)
  }

  getBotId(): string {
    return this.client.user.id;
  }

  deleteMessage(message: Message, reason?: string): Observable<any> {
    return fromPromise(message.delete(reason));
  }

  editMessage(message: Message, newContent: string): Observable<any> {
    return fromPromise(message.edit(newContent))
  }

  getStudentsStatus(): Map<string, ClientStatus | undefined> {
    return this.membersStatus;
  }
}
