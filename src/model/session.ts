export interface Session {
    attendance: string[],
    resources: Resource[]
}

export interface Resource {
    name: string,
    value: string
}