import Libp2p from 'libp2p';
import { ContractService } from "./contract.service";
import ts from "typescript";
import asc, { CompilerOptions } from "assemblyscript/cli/asc";
import * as metering from 'wasm-metering';
import { v4 as uuidv4 } from 'uuid';
import { globalFunctions } from "../wasm/globals";
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

        const moduleBinary = asc.compileString(contract, {
            exportRuntime: true,
            transform: 'as-bind',
            optimize: true,
            optimizeLevel: 3,
            runtime: "incremental",
            runPasses: [
                'asyncify'
            ]
        } as CompilerOptions);

        const meteredWasm = metering.meterWASM(moduleBinary.binary, {
            meterType: 'i32'
        });

        this.wasm.set(contractHash, meteredWasm);

        return meteredWasm;
    }

    async getModule(address, contractHash, contract) {
        const wasm = this.getWASM(contractHash, globalFunctions + "\n" + contract);
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
                address: () => address,
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

        return module;
    }

    async callContract(address: string, contractHash: string, contract: string, payload: { params: string[], method: string }) {
        const module = await this.getModule(address, contractHash, contract);
        const functionName = (module.exports[payload.method] as any);
        const result = await functionName(...payload.params);
        return result;
    }
}