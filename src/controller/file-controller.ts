import {Observable} from "rxjs";
import 'firebase/database';
import {Config} from "../model/config";

const fs = require('fs');
const path = require('path');

export class FileController {

    constructor(private config: Config) {
    }

    writeFile(filePath: string, fileName: string, data: string): Observable<any> {
        return new Observable<any>(observer => {
            fs.mkdir(filePath, {recursive: true}, (err) => {
                if (err) observer.error(err);
                fs.writeFile(path.resolve(filePath, fileName), data, function (err) {
                    if (err) observer.error(err);
                    observer.next();
                });
            });
        });
    }

    readFile(filePath: string, fileName: string): Observable<Buffer> {
        return new Observable<any>(observer => {
            fs.readFile(path.resolve(filePath, fileName), (err, data) => {
                if (err) observer.error(err);
                observer.next(data);
            });
        });
    }
}