import {Session} from "./model/session";

export const CHANNELS = {
    SESSIONS: {
        ID: '818988068799250453'
    },
    VOICE_CLASSES: {
        ID: '818985333525184522'
    },
    ACTIVITIES: {
        ID: '818984004568350726'
    }
}

export const USERS = {
    ADMIN: [
        {id: '818983033838370867'}
    ]
}

export const COMMANDS = {
    REGISTER: 'register',
    ATTENDANCE: 'attendance',
    NEW_SESSION: 'new-session',
    NEW_ACTIVITY: 'new-activity',
    PRESENT_ACTIVITY: 'present-activity',
    TODAY: 'today',
    ABSENCES: 'absences',
    GRADES: 'grades',
    HELP: 'help'
}

export const MESSAGES = {
    HELP: 'Commands:' +
        '\n\n register <Unviersity-Id>' +
        '\n attendance ' +
        '\n new-activity' +
        '\n present-activity' +
        '\n today' +
        '\n absences' +
        '\n grades' +
        '\n help'
}

export const EMOJIS = {
    THUMBS_UP: '👍',
    CHECK: '✅',
    ERROR: '❌',
    PENCIL: '✏️'
}

export const COLORS = {
    SUCCESS: 0x00ff00,
    INFO: 0x0000ff,
    ERROR: 0xff0000
}

export const TIMES = {
    START_TIME: '20:36',
    END_TIME: '20:37'
}

export const DEFAULT_SESSION: Session = {
    attendance: [],
    resources: []
}