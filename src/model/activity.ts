export interface Activity {
    name: string,
    date: string,
    optional: boolean,
    resources: Resource[]
}

export interface Resource {
    name: string,
    value: string
}