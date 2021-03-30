export class CommandUtils {
    static isJson(str: string) {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return str.startsWith("{") || str.startsWith("[");
    }
}