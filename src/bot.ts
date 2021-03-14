import {DiscordController} from "./controller/discord-controller";
import {ClassroomController} from "./controller/classroom-controller";
import {catchError, retry, switchMap} from "rxjs/operators";
import {of} from "rxjs";

class Bot {
    private discord = new DiscordController(this.botToken);
    private controller = new ClassroomController(this.classId, this.discord);

    constructor(private botToken: string, private classId: string) {
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

const bot = new Bot(process.argv[2], "progra-3-2021");