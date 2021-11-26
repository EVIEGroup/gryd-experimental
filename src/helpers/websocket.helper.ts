import { RawData } from 'ws';
import { v4 as uuidv4 } from 'uuid';


export interface Message {
    id: string;
    identifier: string;
    type: string;
    timestamp: Date;
    data?: any;
    origin?: any;
}

export abstract class WebsocketHelper {

    protected getMessage(data: RawData): Message {
        return JSON.parse(data.toString());
    }


    protected createMessage(identifier: string, type: string, data: any, origin?: any) {
        const message = {
            id: uuidv4(),
            identifier,
            type,
            data,
            origin,
            timestamp: new Date(),
        } as Message;

        return message;
    }
}