import { IncomingMessage } from 'http';
import { RawData, WebSocket, WebSocketServer } from 'ws';
import { Message, WebsocketHelper } from '../helpers/websocket.helper';
import { WorkerService } from './worker.service';

interface Node {
    ws: WebSocket;
    req?: IncomingMessage;
    identifier: string;
}

export class NodeService extends WebsocketHelper {
    bootstrapNodesList: any = [
        '127.0.0.1:8080',
        '127.0.0.1:8082',
        '127.0.0.1:8084'
    ];
    nodes = new Map<string, Node>();
    wss: WebSocketServer;
    requestResolveMap = new Map();
    wsNodeMap = new Map();

    constructor(private workerService: WorkerService, port: number, masterport: number) {
        super();
        this.wss = new WebSocketServer({ port });
        this.wss.on('connection', (ws, req) => this.connect(ws, req));

        

        this.bootstrapNodes();
        console.log('Opened Node Server on ' + port);
    }

    // External Node Connects > This Node
    connect(ws: WebSocket, req: IncomingMessage) {
        ws.on('message', (data) => this.message(ws, req, data));
    }

    runMessage(ws: WebSocket, message: Message) {
        if(message.origin && this.requestResolveMap.has(message.origin.id)) {
            const request = this.requestResolveMap.get(message.origin.id);
            request.resolve(message);
            this.requestResolveMap.delete(message.origin.id);
        } else {
            switch(message.type) {
                case "PING":
                    this.sendMessage(ws, 'PONG', null, message);
                    break;
                case "CALL":
                    const response = this.workerService.contractService.callContract(message.data);
                    this.sendMessage(ws, 'CALLS', response, message);
                    break;
                default:
                    console.log(message.type);
                    //this.sendMessage(ws, 'PONG', null, message);
                    break;
            }
        }
    }

    // External Node Sends Message > This Node
    message(ws: WebSocket, req: IncomingMessage, data: RawData) {
        try {
            const message = this.processMessage(ws, data, req);
            this.runMessage(ws, message);
        } catch(e) {
            console.log(e);
            //ws.send('Unrecognised Command');
        }
    }

    bootstrapNodes() {
        for(let node of this.bootstrapNodesList) {
            this.connectToNode(node);
        }
    }

    connectToNode(node: string) {
        try {
            const ws = new WebSocket('ws://'+node);
            ws.on('open', () => {
                this.nodeConnect(ws, node);
            });
            ws.on('error', (e) => {
                ws.close();
            });
            ws.on('close', (e) => {
                this.connectToNode(node);
            });
        } catch(e) {
            this.connectToNode(node);
        }
    }

    // This Node Connects > External Node
    nodeConnect(ws: WebSocket, node: string) {
        ws.on('message', (data) => this.nodeMessage(ws, node, data));

        this.sendMessage(ws, 'PING', null, null, (message: any) => {
            console.log('RECEIVED RESPONSE', message);
        });
    }

    // This Node Sends Message > External Node
    nodeMessage(ws: WebSocket, node: string, data: RawData) {
        try {
            const message = this.processMessage(ws, data);

            this.runMessage(ws, message);
            
        } catch(e) {
            console.log(e);
            //ws.send('Unrecognised Command');
        }
    }

    processMessage(ws: WebSocket, data: RawData, req?: IncomingMessage) {
        const message = this.getMessage(data);

        if(!this.nodes.has(message.identifier) && message.identifier !== this.workerService.identifier) {
            const node = {
                ws,
                identifier: message.identifier,
                req,
            } as Node;

            this.nodes.set(message.identifier, node);
            this.wsNodeMap.set(ws, message.identifier);
        }

        return message;
    }

    sendMessage(ws: WebSocket, type: string, data: any, origin?: any, resolve?: Function) {
        const message = this.createMessage(this.workerService.identifier, type, data, origin);

        if(resolve) {
            this.requestResolveMap.set(message.id, { ...message, resolve });
        }

        ws.send(JSON.stringify(message));
    }

    sendMessageToNodes(type: string, data: any) {
        const timeout = 100;
        const promises = [];
        for(let node of this.nodes.values()) {
            promises.push(new Promise((resolve, reject) => {
                // Set up the timeout
                const timer = setTimeout(() => {
                    resolve(null); // Set null if we didn't respond in time
                }, timeout);

                this.sendMessage(node.ws, type, data, null, (response: any) => {
                    resolve(response);
                });
            }));
        }

        return Promise.all(promises);
    }
}