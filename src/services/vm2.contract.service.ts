import { HttpService } from "./http.service";
import { NodeVM, VMScript } from "vm2";
import { Crypto } from "../helpers/crypto";
import Libp2p from 'libp2p';
import { v4 as uuidv4 } from 'uuid';
import { ContractService } from "./contract.service";
import ts from "typescript";

export class VM2ContractService extends ContractService {
    vm: NodeVM;

    constructor(protected node: Libp2p) {
        super(node, ts.ModuleKind.CommonJS);
    }

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
    
    async callContract(address: string, contractHash: string, contract: string, payload: { params: string[], method: string }) {
        const vm = this.createVM(address, contractHash);
        const deploymentClass = new (vm.run(contract)).default
        const methodParams = payload.params ? payload.params : [];
        return await deploymentClass[payload.method](...methodParams);
    }
}