import {PersistenceController} from "../persistence-controller";
import {FileController} from "../file-controller";
import {DiscordController} from "../discord-controller";
import {GradesController} from "../grades-controller";
import {Config} from "../../model/config";
import {Message, PossiblyUncachedTextableChannel} from "eris";
import {Observable, zip} from "rxjs";
import {catchError, concatMap, flatMap, map, switchMap, toArray} from "rxjs/operators";
import {GradesOfCommand} from "./grades-of-command";
import {handleError, handleSuccess} from "./common-handlers";
import {SummaryCommand} from "./summary-command";
import {DateUtils} from "../../utils/date-utils";

export class ExportReportCommand {
    constructor(private persistence: PersistenceController,
                private fileController: FileController,
                private discord: DiscordController,
                private gradesController: GradesController,
                private summaryCommand: SummaryCommand,
                private gradesOfCommand: GradesOfCommand,
                private config: Config) {
    }

    execute(message: Message<PossiblyUncachedTextableChannel>, args: string[]): Observable<boolean> {
        const fileName = `grades_report_export_${Date.now()}.txt`;
        const filePath = `${this.config.classes[0].code}_summary/exports`;
        const fileMessage = `Summary report to date ${new Date().toString()}`;

        return zip(
            this.summaryCommand.getGradesSummary(),
            this.persistence.getAllUsers().pipe(
                flatMap(users => users),
                concatMap(user => this.gradesOfCommand.getGradesForDiscordId(user.discordId)),
                toArray(),
                map(responses => responses.join('\n\n\n\n'))
            )
        ).pipe(
            map(response => `GRADES REPORT EXPORT FOR ${DateUtils.getTodayAsString()}` + '\n\n\n\n' + response.join('\n\n\n\n')),
            switchMap(stringResponse => this.fileController.writeFile(filePath, fileName, stringResponse)),
            switchMap(() => this.fileController.readFile(filePath, fileName)),
            switchMap(buffer => this.discord.sendFileToChannelId(message.channel.id, fileMessage, buffer, fileName)),
            switchMap(() => handleSuccess(this.discord, message)),
            catchError(error => handleError(this.discord, message, error))
        )
    }
}
