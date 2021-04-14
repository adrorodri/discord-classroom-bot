export interface Activity {
    name: string,
    date: string,
    optional: boolean,
    resources: Resource[]
}

export interface ActivitySummary {
    name: string,
    date: string,
    optional: boolean,
    presented: string,
    grade: string
}

export interface Resource {
    name: string,
    value: string
}