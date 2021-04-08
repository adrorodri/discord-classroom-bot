import {DiscordController} from "./controller/discord-controller";
import {ClassroomController} from "./controller/classroom-controller";
import {switchMap} from "rxjs/operators";
import {Config} from "./model/config";
import {config} from "./bot-config";
import {Logger} from "./utils/logger";
import {GradesController} from "./controller/grades-controller";

class Bot {
    private discord = new DiscordController(this.config);
    private grades = new GradesController();
    private controller = new ClassroomController(this.config, this.discord, this.grades);

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

const setTZ = require('set-tz');
setTZ(config.timezone);

const bot = new Bot(config);