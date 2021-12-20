import Libp2p from 'libp2p';
import { ContractService } from "./contract.service";
import ts from "typescript";
import asm from "assemblyscript";
import asc, { CompilerOptions } from "assemblyscript/cli/asc";
import loader from "@assemblyscript/loader";
import { WASI } from 'wasi';

import * as metering from 'wasm-metering';

const AsBind = require("as-bind/dist/as-bind.cjs.js");

export class WASMContractService extends ContractService {
    modules = new Map

    constructor(protected node: Libp2p) {
        super(node, ts.ModuleKind.None);
    }


    
    async createVM(address: string, contractHash: string, contract: string) {

    }

    getWASM(contractHash: string, contract: string) {
        if(this.modules.has(contractHash)) {
            return this.modules.get(contractHash);
        }

        const moduleBinary = asc.compileString(contract, {
            exportRuntime: true,
            transform: 'as-bind',
            optimize: true,
            optimizeLevel: 10,
            runtime: "incremental"
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
            },
            console: { log: (value: string) =>  console.log('what', value) }
        });

        const defaultClass = (module.exports.default as any);
        const contractInstance = new defaultClass();
        const resultPin = contractInstance[payload.method](...payload.params);

        return resultPin;
        // try {
        //     const result = module.exports.__getString(resultPin);
        //     return result;
        // } catch(e) {
        //     return resultPin;
        // }
    }
}