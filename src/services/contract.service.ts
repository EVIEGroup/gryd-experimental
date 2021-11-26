import { HttpService } from "./http.service";
import { NodeVM, VMScript } from "vm2";
import ts from "typescript";
import asm from "assemblyscript";
import asc from "assemblyscript/cli/asc";
import crypto from 'crypto';
import { WorkerService } from "./worker.service";

export class ContractService {
    vm: NodeVM;
    hashes = new Map();
    state: any = {};

    constructor(private workerService: WorkerService) {
        this.vm = new NodeVM({ 
            sandbox: { 
                updateState: (key: string, value: any) => this.updateState(key, value), 
                getState: (key: string) => this.getState(key), 
                process: { title: 'Decentranet' }, 
                eval: null 
            },
            eval: false, 
            wasm: false,
            require: {
                external: false,
                builtin: ['http-service'],
                context: 'sandbox',
                mock: {
                    'http-service': { HttpService }
                }
            }
        });
    }

    updateState(key: string, value: any) {
        this.state[key] = value;
    }

    getState(key: string) {
        return this.state[key];
    }

    compile(script: string) {
        //const output: any = asc.compileString(`export function test(): void {}`, { optimizeLevel: 0, measure: true, runtime: "stub" }); // Do we want to compile webassembly instead?
        const res = ts.transpileModule(script, { reportDiagnostics: true, compilerOptions: { module: 1 } });
        return new VMScript(res.outputText);
    }
    
    find(hash: string) {
        if(this.hashes.has(hash)) {
            return this.hashes.get(hash);
        } else {
            throw new Error('Cannot find deployed script');
        }
    }
    

    deploy(script: string) {
        const hash = crypto.createHash('sha256').update(script).digest('hex');
        let compiledScript: VMScript = this.compile(script);
        
        this.hashes.set(hash, new (this.vm.run(compiledScript)).default);

        return hash; 
    }


    deployContract(payload: { data: string }) {
        const base64Data = Buffer.from(payload.data, 'base64');
        const hash = this.deploy(base64Data.toString('utf8'));
        return hash;
    }

    deployedContracts() {
        return Object.keys(this.hashes);
    }
    
    callContract(payload: { hash: string, params: any, method: string }) {
        console.time("dbsave");
        const deploymentClass = this.find(payload.hash);
        const methodParams = payload.params ? payload.params : [];
        const response = deploymentClass[payload.method](...methodParams);
        console.timeEnd("dbsave");
        return response;
    }
}