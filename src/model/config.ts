export interface Config {
    "bot_token": string,
    "teacher": {
        "discordId": string
    },
    "channels": {
        "attendance": string,
        "activities": string,
        "participations": string,
        "main_voice": string
    },
    "classes": [
        {
            "name": string,
            "code": string,
            "start_time": string,
            "end_time": string
        }
    ]
}