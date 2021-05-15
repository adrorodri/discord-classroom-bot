import {COMMANDS} from "../constants";

export class NotRegisteredError extends Error {
    message = `No registrado, para registrar enviar comando \"${COMMANDS.REGISTER} <CODIGO-UPB>\"`
}
