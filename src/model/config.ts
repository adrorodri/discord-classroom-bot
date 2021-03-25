export interface Config {
    "bot_token": string,
    "teacher": {
        "discordId": string
    },
    "guildId": string,
    "channels": {
        "announcements": string,
        "activities": string,
        "participations": string,
        "main_voice": string
    },
    "classes": [
        {
            "name": string,
            "code": string,
            "start_time": string,
            "attendance_end_time": string,
            "end_time": string
        }
    ]
}