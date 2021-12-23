import { ContractService } from "./contract.service";
import * as metering from 'wasm-metering';
import { v4 as uuidv4 } from 'uuid';
import { globalWASM } from "../wasm/globals";
import { jsonWASM } from "../wasm/json";

const AsBind = require("as-bind/dist/as-bind.cjs.js");

export class WASMContractService extends ContractService {
    wasm = new Map;
    modules = new Map;

    constructor(node, protected asc) {
        super(node);
    }

    getWASM(contractHash: string, contract: string) {
        const moduleBinary = this.asc.compileString({
            'globals.ts': globalWASM,
            'json.ts': jsonWASM,
            'input.ts': contract,
        }, {
            exportRuntime: true,
            transform: [
                'as-bind',
            ],
            optimize: true,
            optimizeLevel: 3,
            runtime: "incremental",
            runPasses: [
                'asyncify'
            ],
        } as any);

        console.log(moduleBinary.stderr.toString());

        const meteredWasm = metering.meterWASM(moduleBinary.binary, {
            meterType: 'i32'
        });

        return meteredWasm;
    }

    async getModule(address, contractHash, wasm) {
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

    async callContract(address: string, contractHash: string, wasm: string, payload: { params: string[], method: string }) {
        const module = await this.getModule(address, contractHash, wasm);
        const functionName = (module.exports[payload.method] as any);
        const result = await functionName(...payload.params);
        return result;
    }
}