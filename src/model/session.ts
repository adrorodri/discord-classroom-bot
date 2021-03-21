export interface Session {
    date: string,
    attendance: string[],
    resources: Resource[]
}

export interface Resource {
    name: string,
    value: string
}