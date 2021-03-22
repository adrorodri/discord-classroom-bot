export interface Session {
    date: string,
    name: string,
    attendance: string[],
    participation: string[],
    resources: Resource[]
}

export interface Resource {
    name: string,
    value: string
}