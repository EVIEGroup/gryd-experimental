import { RawData, WebSocket, WebSocketServer } from 'ws';
import { WebsocketHelper } from '../helpers/websocket.helper';
import { WorkerService } from './worker.service';

export class ClientService extends WebsocketHelper {
    wss: WebSocketServer;

    constructor(private workerService: WorkerService, port: number) {
        super();
        this.wss = new WebSocketServer({ port });
        this.wss.on('connection', (ws) => this.connect(ws));
        console.log('Opened Client Server on ' + port);
    }

    connect(ws: WebSocket) {
        console.log('Client Connected');
        ws.on('message', (data) => this.message(ws, data));
    }

    message(ws: WebSocket, data: RawData) {
        try {
            const message = this.getMessage(data);
            
            if(message.type) {
                let response: any;
                switch(message.type) {
                    case "DEPLOY":
                        response = this.workerService.contractService.deployContract(message.data);
                        break;
                    case "DEPLOYMENTS":
                        response = this.workerService.contractService.deployedContracts();
                        break;
                    case "CALL":
                        response = this.workerService.contractService.callContract(message.data);
                        break;
                    case "PING":
                        response = 'PONG';
                        break;
                }

                if(typeof response !== 'undefined') {
                    this.workerService.nodeService.sendMessageToNodes(message.type, message.data).then((items: any[]) => {
                        for(let item of items.filter(n => n)) {
                            if(item.data !== response) {
                                this.sendMessage(ws, message.type, 'FAILURE');
                                return;
                            }
                        }

                        this.sendMessage(ws, message.type, response);
                    });
                } else {
                    ws.send('Unrecognised Command Type');
                }
            }
        } catch(e) {
            console.log(e);
        }
    }


    sendMessage(ws: WebSocket, type: string, data: any, origin?: any) {
        const message = super.createMessage(this.workerService.identifier, type, data, origin);
        ws.send(JSON.stringify(message));
    }
}