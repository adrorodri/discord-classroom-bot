import {ClientStatus, Member, Relationship} from "eris";

export class PresenceUtils {
  static getPresenceFromClientStatus(clientStatus?: ClientStatus): string {
    return clientStatus?.desktop === 'online' ? 'Online' :
      clientStatus?.mobile === 'online' ? 'Mobile' :
        clientStatus?.web === 'online' ? 'Web' :
          clientStatus?.desktop === 'idle' || clientStatus?.mobile === 'idle' || clientStatus?.web === 'idle' ? 'Idle' :
            'Offline'
  }
}
