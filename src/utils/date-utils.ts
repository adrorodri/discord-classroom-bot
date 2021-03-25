export class DateUtils {
    static getTodayAsString(): string {
        let today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        const yyyy = today.getFullYear();
        return mm + '-' + dd + '-' + yyyy;
    }

    static isBetween(startTime: string, endTime: string): boolean {
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
}