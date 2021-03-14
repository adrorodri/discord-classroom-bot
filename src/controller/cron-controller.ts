export class CronController {
    private cron = require('node-cron');

    addTask(cronTime: string, task: () => void) {
        this.cron.schedule(cronTime, task);
    }

    public static getCronTimeForHourMinute(hourMinute: string): string {
        const hour = hourMinute.split(':')[0];
        const minute = hourMinute.split(':')[1];
        return `${minute} ${hour} * * *`;
    }
}