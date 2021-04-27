export class DateUtils {
    static nowMillis(): string {
        return (new Date().getTime()).toString();
    }

    static nowISO(): string {
        return (new Date().toISOString()).toString();
    }

    static nowString(): string {
        return (new Date().toString()).toString();
    }

    static getTodayAsString(): string {
        let today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        const yyyy = today.getFullYear();
        return mm + '-' + dd + '-' + yyyy;
    }

    static isBetweenTimes(startTime: string, endTime: string): boolean {
        const from = new Date();
        from.setHours(Number(startTime.split(':')[0]));
        from.setMinutes(Number(startTime.split(':')[1]));
        from.setMilliseconds(0);
        from.setSeconds(0);
        const to = new Date();
        to.setHours(Number(endTime.split(':')[0]));
        to.setMinutes(Number(endTime.split(':')[1]));
        to.setMilliseconds(0);
        to.setSeconds(0);
        const now = new Date();
        return from.getTime() < now.getTime() && now.getTime() < to.getTime();
    }

    static getTimeXMinutesEarlierAsString(time: string, minutesBefore: number) {
        const msPerMinute = 60000;
        const from = new Date();
        from.setHours(Number(time.split(':')[0]));
        from.setMinutes(Number(time.split(':')[1]));
        from.setMilliseconds(0);
        from.setSeconds(0);
        const then = new Date(from.getTime() - (minutesBefore * msPerMinute));
        return `${String(then.getHours()).padStart(2, '0')}:${String(then.getMinutes()).padStart(2, '0')}`;
    }

    static isBetweenDates(startDate: string, endDate: string, date = DateUtils.getTodayAsString()) {
        const from = Date.parse(startDate);
        const to = Date.parse(endDate);
        const now = Date.parse(date);
        return from <= now && now <= to;
    }

    static isAfter(startDate: string) {
        const from = Date.parse(startDate);
        const now = Date.parse(DateUtils.getTodayAsString());
        return from <= now;
    }

    static getTimestampAsDateString(timestamp: number) {
        let date = new Date(timestamp);
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0'); //January is 0!
        const yyyy = date.getFullYear();
        return mm + '-' + dd + '-' + yyyy;
    }
}
