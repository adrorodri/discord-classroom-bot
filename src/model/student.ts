export interface Student {
    name: string,
    discordId: string,
    universityId: string,
    attendance: string[],
    participations: string[],
    activities: { activity: string, presentation: string, time: string }[],
    activities_grades: { activity: string, grade: string }[],
    exams_grades: { partialName: string, grade: string }[]
}