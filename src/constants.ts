export const COMMANDS = {
    REGISTER: '-registrar',
    ACTIVITY: '-actividad',
    ATTENDANCE: '-asistencia',
    NEW_SESSION: '-new-session',
    NEW_ACTIVITY: '-new-activity',
    PARTICIPATION: '-participacion',
    MY_ABSENCES: '-mis-ausencias',
    PRESENT_ACTIVITY: '-present-activity',
    TODAY: '-hoy',
    ABSENCES: '-ausencias',
    GRADES: '-notas',
    HELP: '-help',
    TIME: '-time'
}

export const MESSAGES = {
    HELP_PUBLIC: 'Commands:' +
        `\n\n ${COMMANDS.REGISTER} <Unviersity-Id> --> Registrarse en el bot` +
        `\n ${COMMANDS.ATTENDANCE} <código> --> Registra tu asistencia (solo se permite al inicio del horario de clase)` +
        `\n ${COMMANDS.ACTIVITY} <mensaje, link o archivo adjunto> --> Registra la actividad del dia de hoy (valido hasta 23:59)` +
        `\n ${COMMANDS.PARTICIPATION} --> Registra una participacion (se valida por el docente)` +
        `\n ${COMMANDS.MY_ABSENCES} --> Te indica cuantas ausencias tienes acumuladas` +
        `\n ${COMMANDS.TODAY} --> Devuelve un mensaje con la informacion de la sesion y actividad del dia de hoy` +
        `\n ${COMMANDS.HELP} --> Muestra este mensaje de ayuda`,

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
    PENCIL: '✏️',
    CHAT_BUBBLE: '🗨️'
}

export const COLORS = {
    SUCCESS: 0x00ff00,
    INFO: 0x0000ff,
    ERROR: 0xff0000
}