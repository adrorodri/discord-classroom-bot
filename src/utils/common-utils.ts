export class CommonUtils {
    static getAverage(array: number[]): number {
        return array.reduce((sum, num) => sum + num, 0) / array.length;
    }

        static getBasicStringFromString(value: string | undefined): string {
        return value?.split(' ')?.join('_') ?? 'undefined'
    }
}