export interface Session {
    date: string,
    attendance: string[],
    participation: string[],
    resources: Resource[]
}

export interface Resource {
    name: string,
    value: string
}