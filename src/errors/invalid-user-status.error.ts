export class InvalidUserStatusError extends Error {
    message = 'El comando no pudo registrarse, verificar:\n' +
        '1) Usar solo cliente de Discord para computadora.\n' +
        '2) Verificar que tu status sea Online (punto verde).\n' +
        '3) Esperar 5+ minutos despues de abrir o cerrar el cliente de Discord y reintentar.'
}