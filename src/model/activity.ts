export interface Activity {
    name: string,
    date: string,
    resources: Resource[]
}

export interface Resource {
    name: string,
    value: string
}