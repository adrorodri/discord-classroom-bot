export interface ClassUser {
    attendance: string[],
    activities: UserActivity[],
    participations: string[],
    discordId: string
}

export interface UserActivity {
    activity: string,
    presentation: string,
    time: string
}