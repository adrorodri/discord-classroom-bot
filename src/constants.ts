export const COMMANDS = {
    REGISTER: '-registrar',
    ACTIVITY: '-actividad',
    ATTENDANCE: '-asistencia',
    NEW_SESSION: '-new-session',
    NEW_ACTIVITY: '-new-activity',
    PARTICIPATION: '-participacion',
    MANUAL_ATTENDANCE: '-manual-attendance',
    MANUAL_PARTICIPATION: '-manual-participation',
    MANUAL_ACTIVITY: '-manual-activity',
    MANUAL_EXAM_GRADE: '-manual-exam-grade',
    MANUAL_ACTIVITY_GRADE: '-manual-activity-grade',
    MY_ABSENCES: '-mis-ausencias',
    MY_GRADES: '-mis-notas',
    GRADES_OF: '-grades-of',
    PRESENT_ACTIVITY: '-present-activity',
    TOPS_BOTTOMS: '-tops-bottoms',
    WHOIS: '-whois',
    SUMMARY: '-summary',
    TODAY: '-hoy',
    ABSENCES: '-ausencias',
    GRADES: '-notas',
    HELP: '-help',
    TIME: '-time'
}

export const DIVIDER = '-------------------';
export const TITLE_SPACER = '-- ';

export const MESSAGES = {
    HELP_PUBLIC: 'Commands:' +
        `\n\n ${COMMANDS.REGISTER} <Unviersity-Id> --> Registrarse en el bot` +
        `\n ${COMMANDS.ATTENDANCE} <código> --> Registra tu asistencia (solo se permite al inicio del horario de clase)` +
        `\n ${COMMANDS.ACTIVITY} <mensaje, link o archivo adjunto> --> Registra la actividad del dia de hoy (valido hasta 23:59)` +
        `\n ${COMMANDS.PARTICIPATION} --> Registra una participacion (se valida por el docente)` +
        `\n ${COMMANDS.MY_ABSENCES} --> Te indica cuantas ausencias tienes acumuladas` +
        `\n ${COMMANDS.MY_GRADES} --> Te indica la calificacion de cada actividad presentada` +
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
    CHAT_BUBBLE: '🗨️',
    GRADE_0: '0️⃣',
    GRADE_1: '1️⃣',
    GRADE_2: '2️⃣',
    GRADE_3: '3️⃣',
    GRADE_4: '4️⃣',
    GRADE_5: '5️⃣',
    GRADE_6: '6️⃣',
    GRADE_7: '7️⃣',
    GRADE_8: '8️⃣',
    GRADE_9: '9️⃣',
    GRADE_10: '🔟',
}

export const COLORS = {
    SUCCESS: 0x00ff00,
    INFO: 0x0000ff,
    ERROR: 0xff0000
}