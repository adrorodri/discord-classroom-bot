export class Logger {
    static log = (...args: any[]) => {
        const time = new Date();
        console.log(time.toISOString(), ...args);
    }

    static warn = (...args: any[]) => {
        const time = new Date();
        console.warn(time.toISOString(), ...args);
    }

    static error = (...args: any[]) => {
        const time = new Date();
        console.error(time.toISOString(), ...args);
    }
}