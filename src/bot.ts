import {DiscordController} from "./controller/discord-controller";
import {ClassroomController} from "./controller/classroom-controller";
import {catchError, retry, switchMap} from "rxjs/operators";
import {of} from "rxjs";
import {Config} from "./model/config";
import {config} from "./bot-config";

class Bot {
    private discord = new DiscordController(this.botToken);
    private controller = new ClassroomController(this.config, this.discord);

    constructor(private botToken: string, private config: Config) {
        this.discord.start().pipe(
            switchMap(() => this.discord.subscribeToMessages()),
            switchMap(message => this.controller.processMessage(message)),
            catchError(error => {
                console.error('Operation error: ', error)
                return of('')
            }),
            retry(5)
        ).subscribe(() => {
        }, error => {
            console.error('Bot error: ', error)
        });
    }
}

if (!process.argv || process.argv.length < 2) {
    throw new Error('No token provided');
}
const bot = new Bot(process.argv[2], config);