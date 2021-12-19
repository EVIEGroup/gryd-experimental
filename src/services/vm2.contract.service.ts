import { HttpService } from "./http.service";
import { NodeVM, VMScript } from "vm2";
import ts from "typescript";
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string';
import { toString as uint8ArrayToString } from 'uint8arrays/to-string';
import { Crypto } from "../helpers/crypto";
import Libp2p from 'libp2p';
import { v4 as uuidv4 } from 'uuid';

export class ContractService {
    vm: NodeVM;

    constructor(protected node: Libp2p) {}

    createVM(address: string, contractHash: string) {
        const globals = { 
            updateState: async (key: string, value: any) => this.updateState(contractHash, key, value), 
            getState: async (key: string) => this.getState(contractHash, key), 
            process: { title: 'Decentranet', address: address, contract: contractHash, context: uuidv4() }, 
            eval: null 
        };

        if(this.vm) {
            this.vm.setGlobals(globals);
            return this.vm;
        }

        return this.vm = new NodeVM({ 
            sandbox: globals,
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
        const stateUpdate = {
            //nonce: uuidv4(),
            key: key,
            value: value,
        }

        const encodedValue = uint8ArrayFromString(JSON.stringify(stateUpdate));

        const run = async () => {
            try {
                await this.node.contentRouting.put(uint8ArrayFromString(contractHash + key), encodedValue);
                this.node.pubsub.publish(contractHash, encodedValue);
            } catch(e) {
                await run();
            }
        };

        run();

        return value;
    }

    async getState(contractHash: string, key: string) {
        try {
            const value = await this.node.contentRouting.get(uint8ArrayFromString(contractHash + key));
            const decoded = JSON.parse(uint8ArrayToString(value.val));
            const trueValue = decoded.value;
            
            return parseInt(trueValue);
        } catch(e) {
            return null;
        }
    }

    compile(script: string) {
        const res = ts.transpileModule(script, { reportDiagnostics: true, compilerOptions: { module: 1 } });
        return new VMScript(res.outputText).code;
    }
    
    async callContract(address: string, contractHash: string, contract: VMScript, payload: { params: string[], method: string }) {
        const vm = this.createVM(address, contractHash);
        const deploymentClass = new (vm.run(contract)).default
        const methodParams = payload.params ? payload.params : [];
        return await deploymentClass[payload.method](...methodParams);
    }
}