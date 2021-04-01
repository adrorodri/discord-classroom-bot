import {EMOJIS} from "../constants";
import {Message} from "eris";

export class CommandUtils {
    static isJson(str: string) {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return str.startsWith("{") || str.startsWith("[");
    }

    static getAvailableGradeReactions(): string[] {
        return [
            EMOJIS.GRADE_0,
            EMOJIS.GRADE_1,
            EMOJIS.GRADE_2,
            EMOJIS.GRADE_3,
            EMOJIS.GRADE_4,
            EMOJIS.GRADE_5,
            EMOJIS.GRADE_6,
            EMOJIS.GRADE_7,
            EMOJIS.GRADE_8,
            EMOJIS.GRADE_9,
            EMOJIS.GRADE_10
        ]
    }

    static getGradeFromReaction(reactionEmoji: string): string {
        switch (reactionEmoji) {
            case EMOJIS.GRADE_0:
                return '0';
            case EMOJIS.GRADE_1:
                return '1';
            case EMOJIS.GRADE_2:
                return '2';
            case EMOJIS.GRADE_3:
                return '3';
            case EMOJIS.GRADE_4:
                return '4';
            case EMOJIS.GRADE_5:
                return '5';
            case EMOJIS.GRADE_6:
                return '6';
            case EMOJIS.GRADE_7:
                return '7';
            case EMOJIS.GRADE_8:
                return '8';
            case EMOJIS.GRADE_9:
                return '9';
            case EMOJIS.GRADE_10:
                return '10';
            default:
                return '0';
        }
    }

    static getDiscordIdFromEmbedMessage(message: Message): string {
        let discordId = '';
        message.embeds.forEach(e => e.fields?.forEach(f => {
            if (f.name === 'discordId') {
                discordId = f.value;
            }
        }));
        return discordId;
    }

    static getActivityFromEmbedMessage(message: Message): string {
        let date = '';
        message.embeds.forEach(e => e.fields?.forEach(f => {
            if (f.name === 'Activity') {
                date = f.value.split(" - ")[1];
            }
        }));
        return date;
    }
}