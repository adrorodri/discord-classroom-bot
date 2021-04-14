export interface Session {
    date: string,
    name: string,
    attendance: string[],
    attendanceCode: string,
    participation: string[],
    resources: Resource[]
}

export interface Resource {
    name: string,
    value: string
}

export interface AttendanceSummary {
    date: string,
    name: string,
    attended: string
}