import {DiscordController} from "./controller/discord-controller";
import {ClassroomController} from "./controller/classroom-controller";
import {catchError, retry, switchMap, tap} from "rxjs/operators";
import {of} from "rxjs";
import {Config} from "./model/config";
import {config} from "./bot-config";
import {Logger} from "./utils/logger";

class Bot {
    private discord = new DiscordController(this.config);
    private controller = new ClassroomController(this.config, this.discord);

    constructor(private config: Config) {
        this.discord.start().pipe(
            switchMap(() => this.discord.subscribeToMessages()),
            tap(message => {
                Logger.log('Message', message.channel.id, JSON.stringify(message.toJSON()));
            }),
            switchMap(message => this.controller.processMessage(message)),
            catchError(error => {
                Logger.error('Operation error: ', error)
                return of('')
            }),
            retry(5)
        ).subscribe(() => {
        }, error => {
            Logger.error('Bot error: ', error)
        });
    }
}

const bot = new Bot(config);