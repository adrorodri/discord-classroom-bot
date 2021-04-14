export interface Config {
    bot_token: string,
    timezone: string,
    teacher: {
        discordId: string
    },
    guildId: string,
    channels: {
        announcements: string,
        participations: string,
        main_voice: string,
        activities_presented: string
    },
    classes: [
        {
            name: string,
            code: string,
            start_time: string,
            attendance_end_time: string,
            end_time: string
        }
    ],
    partials: { name: string, startDate: string, endDate: string }[]
}