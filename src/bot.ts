import {DiscordController} from "./controller/discord-controller";
import {ClassroomController} from "./controller/classroom-controller";
import {switchMap} from "rxjs/operators";
import {Config} from "./model/config";
import {config} from "./bot-config";
import {Logger} from "./utils/logger";

class Bot {
    private discord = new DiscordController(this.config);
    private controller = new ClassroomController(this.config, this.discord);

    constructor(private config: Config) {
        this.discord.start().pipe(
            switchMap(() => this.discord.subscribeToMessages())
        ).subscribe(message => {
            Logger.log('Message', message.channel.id, JSON.stringify(message.toJSON()));
            this.controller.processMessage(message).subscribe(
                () => Logger.error('Operation success'),
                error => Logger.error('Operation error: ', error)
            )
        }, error => Logger.error('Bot error: ', error));
    }
}

process.env.TZ = 'America/La_Paz' // Timezone hotfix
const bot = new Bot(config);