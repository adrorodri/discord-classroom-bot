export interface Student {
    name: string,
    discordId: string,
    universityId: string,
    attendance: string[],
    participations: string[],
    activities: string[],
    activities_grades: { activity: string, grade: string }[],
    exams_grades: string,
    participations_grades: string[]
}