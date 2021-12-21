import Libp2p from 'libp2p';
import { ContractService } from "./contract.service";
import ts from "typescript";
import asc, { CompilerOptions } from "assemblyscript/cli/asc";
import * as metering from 'wasm-metering';

const AsBind = require("as-bind/dist/as-bind.cjs.js");

export class WASMContractService extends ContractService {
    modules = new Map

    constructor(protected node: Libp2p) {
        super(node, ts.ModuleKind.None);
    }

    getWASM(contractHash: string, contract: string) {
        if(this.modules.has(contractHash)) {
            return this.modules.get(contractHash);
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

        this.modules.set(contractHash, meteredWasm);

        return meteredWasm;
    }

    async callContract(address: string, contractHash: string, contract: string, payload: { params: string[], method: string }) {
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
                contractHash: () => contractHash,
                value: () => 1,
                updateState: async (key: string, value: string) => {
                    // const key = module.exports.__getString(keyPointer);
                    // const value = module.exports.__getString(valuePointer);
                    // console.log(key, value);
                    const result = await this.updateState(contractHash, key, value);
                    return result;
                },
                getState: async (key: string) => {
                    const res = await this.getState(contractHash, key);
                    return res;
                    // const key = module.exports.__getString(keyPointer);
                    // const value = module.exports.__getString(valuePointer);
                    // console.log(key, value);
                    //return res;
                },
            },
            console: {
                log: (description: string, value: string) =>  console.log(description, value, typeof value) 
            },
        });

        const defaultClass = (module.exports.test as any);
        // console.log(module.exports);
        // throw Error('lol');
        // const contractInstance = new defaultClass();
        // const resultPointer = contractInstance[payload.method](...payload.params);
        const resultPointer = await defaultClass(...payload.params);
        // console.log(module.exports.__getString(resultPointer));
        console.log(resultPointer);
        return resultPointer;
    }
}