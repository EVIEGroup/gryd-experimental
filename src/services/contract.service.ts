import { HttpService } from "./http.service";
import { NodeVM, VMScript } from "vm2";
import ts from "typescript";
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string';
import { toString as uint8ArrayToString } from 'uint8arrays/to-string';
import { Crypto } from "../helpers/crypto";
import Libp2p from 'libp2p';

export class ContractService {
    constructor(protected node: Libp2p) {}

    createVM(contractHash: string) {
        return new NodeVM({ 
            sandbox: { 
                updateState: async (key: string, value: any) => this.updateState(contractHash, key, value), 
                getState: async (key: string) => this.getState(contractHash, key), 
                process: { title: 'Decentranet', contract: contractHash }, 
                eval: null 
            },
            eval: false, 
            wasm: false,
            require: {
                external: false,
                builtin: ['http-service'],
                context: 'sandbox',
                mock: {
                    'http-service': { HttpService },
                    'crypto': { Crypto }
                }
            }
        });
    }

    async updateState(contractHash: string, key: string, value: any) {
        await this.node.contentRouting.put(uint8ArrayFromString(contractHash + key), uint8ArrayFromString(value));
        await this.node.pubsub.publish(contractHash, uint8ArrayFromString(value));
        return value;
    }

    async getState(contractHash: string, key: string) {
        try {
            const value = await this.node.contentRouting.get(uint8ArrayFromString(contractHash + key));
            const trueValue = uint8ArrayToString(value.val);
            
            return parseInt(trueValue);
        } catch(e) {
            return null;
        }
    }

    compile(script: string) {
        const res = ts.transpileModule(script, { reportDiagnostics: true, compilerOptions: { module: 1 } });
        return new VMScript(res.outputText);
    }
    
    callContract(contractHash: string, contract: VMScript, payload: { params: string[], method: string }) {
        const vm = this.createVM(contractHash);
        const deploymentClass = new (vm.run(contract)).default
        const methodParams = payload.params ? payload.params : [];
        const response = deploymentClass[payload.method](...methodParams);
        return response;
    }
}