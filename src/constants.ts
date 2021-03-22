export const COMMANDS = {
    REGISTER: '-register',
    ATTENDANCE: '-attendance',
    NEW_SESSION: '-new-session',
    NEW_ACTIVITY: '-new-activity',
    PARTICIPATION: '-participation',
    MY_ABSENCES: '-my-absences',
    PRESENT_ACTIVITY: '-present-activity',
    TODAY: '-today',
    ABSENCES: '-absences',
    GRADES: '-grades',
    HELP: '-help'
}

export const MESSAGES = {
    HELP_PUBLIC: 'Commands:' +
        `\n\n ${COMMANDS.REGISTER} <Unviersity-Id>` +
        `\n ${COMMANDS.ATTENDANCE}` +
        `\n ${COMMANDS.PARTICIPATION}` +
        `\n ${COMMANDS.MY_ABSENCES}` +
        `\n ${COMMANDS.TODAY}` +
        `\n ${COMMANDS.HELP}`,

    HELP_ADMIN: 'Commands:' +
        `\n\n ${COMMANDS.NEW_SESSION}` +
        `\n ${COMMANDS.NEW_ACTIVITY}` +
        `\n ${COMMANDS.TODAY}` +
        `\n ${COMMANDS.GRADES}` +
        `\n ${COMMANDS.HELP}`,
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