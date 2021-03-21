export interface Config {
    "teacher": {
        "discordId": string
    },
    "channels": {
        "attendance": string,
        "activities": string,
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