import Libp2p from 'libp2p';
import { ContractService } from "./contract.service";
import ts from "typescript";
import asc, { CompilerOptions } from "assemblyscript/cli/asc";
import * as metering from 'wasm-metering';
import { v4 as uuidv4 } from 'uuid';
const fs = require('fs');
const AsBind = require("as-bind/dist/as-bind.cjs.js");

export class WASMContractService extends ContractService {
    wasm = new Map;
    modules = new Map;

    constructor(protected node: Libp2p) {
        super(node, ts.ModuleKind.None);
    }

    getWASM(contractHash: string, contract: string) {
        if(this.wasm.has(contractHash)) {
            return this.wasm.get(contractHash);
        }

        asc.options.asyncify = {
          description: 'Enables Asyncify',
          type: 'b',
        };

        const moduleBinary = asc.compileString(contract, {
            exportRuntime: true,
            transform: 'as-bind',
            optimize: true,
            optimizeLevel: 10,
            runtime: "incremental",
            asyncify: true,
            runPasses: [
                'asyncify'
            ]
        } as CompilerOptions);

        const meteredWasm = metering.meterWASM(moduleBinary.binary, {
            meterType: 'i32'
        });
        
        fs.writeFileSync('contract.wast', moduleBinary.text);
        // console.log(moduleBinary.text);
        // throw new Error('lol');

        this.wasm.set(contractHash, meteredWasm);

        return meteredWasm;
    }

    async getModule(contractHash, contract) {
        // if(this.modules.has(contractHash)) {
        //     return this.modules.get(contractHash);
        // }

        const wasm = this.getWASM(contractHash, contract);
        const limit = 90000000;
        let gasUsed = 0;

        const module = AsBind.instantiateSync(wasm, {
            'metering': {
                'usegas': (gas) => {
                    gasUsed += gas;
                    if (gasUsed > limit) {
                        throw new Error('out of gas!')
                    }
                }
            },
            process: {
                address: () => contractHash,
                random: () => uuidv4(),
                contractHash: () => contractHash,
                value: () => 1,
                updateState: async (key: string, value: string) => {
                    const result = await this.updateState(contractHash, key, value);
                    return result;
                },
                getState: async (key: string) => {
                    const res = await this.getState(contractHash, key);
                    return res;
                },
            },
            console: {
                log: (description: string, value: string) =>  console.log(description, value, typeof value) 
            },
        });

        this.modules.set(contractHash, module);

        return module;
    }

    async callContract(address: string, contractHash: string, contract: string, payload: { params: string[], method: string }) {
        const module = await this.getModule(contractHash, contract);
        const defaultClass = (module.exports[payload.method] as any);
        // console.log(module.exports);
        // throw Error('lol');
        // const contractInstance = new defaultClass();
        // const resultPointer = contractInstance[payload.method](...payload.params);
        const resultPointer = await defaultClass(...payload.params);
        // console.log(resultPointer);
        //console.log(module);
        //throw new Error('lol');
        // console.log(module.exports.__getString(resultPointer));
        // console.log(resultPointer, gasUsed);
        return resultPointer;
    }
}