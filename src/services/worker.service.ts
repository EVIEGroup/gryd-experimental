import { NodeVM, VMScript } from "vm2";
import { HttpService } from "./http.service";
import { RawData, WebSocket, WebSocketServer } from 'ws';
import ts from "typescript";
import asm from "assemblyscript";
import asc from "assemblyscript/cli/asc";
import crypto from 'crypto';

export class WorkerService {
    vm: NodeVM;
    hashes: { [key: string]: any } = { };
    wss: WebSocketServer;
    state: any = {};

    constructor() {
        this.vm = new NodeVM({ 
            sandbox: { 
                updateState: (key: string, value: any) => this.updateState(key, value), 
                getState: (key: string) => this.getState(key), 
                process: { title: 'Decentranet' }, 
                eval: null 
            },
            eval: false, 
            wasm: true,
            require: {
                external: false,
                builtin: ['http-service'],
                context: 'sandbox',
                mock: {
                    'http-service': { HttpService }
                }
            }
        });

        this.wss = new WebSocketServer({ port: 8080 });
        this.wss.on('connection', (ws) => this.connect(ws));
        console.log('Listening on 8080');
    }

    updateState(key: string, value: any) {
        this.state[key] = value;
    }

    getState(key: string) {
        return this.state[key];
    }

    connect(ws: WebSocket) {
        console.log('Connected');
        ws.on('message', (data) => this.message(ws, data));
    }

    message(ws: WebSocket, data: RawData) {
        try {
            const dataPayload = JSON.parse(data.toString());
            
            if(dataPayload.type) {
                switch(dataPayload.type) {
                    case "DEPLOY":
                        const base64Data = Buffer.from(dataPayload.data, 'base64');
                        const hash = this.deploy(base64Data.toString('utf8'));
                        ws.send(hash);
                        break;
                    case "DEPLOYMENTS":
                        ws.send(JSON.stringify(Object.keys(this.hashes)));
                        break;
                    case "CALL":
                        console.time("dbsave");
                        const deploymentClass = this.find(dataPayload.hash);
                        const methodParams = dataPayload.params ? dataPayload.params : [];
                        const response = deploymentClass[dataPayload.method](...methodParams);
                        console.timeEnd("dbsave");
                        ws.send(response);
                        break;
                    default:
                        ws.send('Unrecognised Command Type');
                        break;
                }
            }
        } catch(e) {
            console.log(e);
            ws.send('Unrecognised Command');
        }

        // console.log('Messaged', data.toString());
    }

    compile(script: string) {
       //const output: any = asc.compileString(`export function test(): void {}`, { optimizeLevel: 0, measure: true, runtime: "stub" }); // Do we want to compile webassembly instead?
        const res = ts.transpileModule(script, { reportDiagnostics: true, compilerOptions: { module: 1 } });
        return new VMScript(res.outputText);
    }
    
    find(hash: string) {
        if(this.hashes[hash]) {
            return this.hashes[hash];
        } else {
            throw new Error('Cannot find deployed script');
        }
    }

    deploy(script: string) {
        const hash = crypto.createHash('sha256').update(script).digest('hex');
        let compiledScript: VMScript = this.compile(script);
        
        this.hashes[hash] = new (this.vm.run(compiledScript)).default;

        console.log(hash);

        return hash; 
    }
}