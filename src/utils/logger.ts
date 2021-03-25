export class Logger {
    static log = (...args: any[]) => {
        const time = new Date();
        console.log.apply(time.toISOString(), args);
    }

    static error = (...args: any[]) => {
        const time = new Date();
        console.error.apply(time.toISOString(), args);
    }
}