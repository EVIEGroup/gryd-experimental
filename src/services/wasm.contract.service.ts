import { ContractService } from "./contract.service";
import * as metering from 'wasm-metering';
import { v4 as uuidv4 } from 'uuid';
import { globalWASM } from "../wasm/globals";
import { jsonWASM } from "../wasm/json";
import * as asBindTransform from 'as-bind/dist/transform.cjs';
import asc from 'assemblyscript/cli/asc';

const AsBind = require("as-bind/dist/as-bind.cjs.js");

export class WASMContractService extends ContractService {
    wasm = new Map;
    modules = new Map;

    constructor() {
        super();
    }

    /** Compiles WASM */
    compileString(contractSource) {
        const output = Object.create({
            stdout: asc.createMemoryStream(),
            stderr: asc.createMemoryStream()
        });

        var argv = [
            "--binaryFile", "binary",
            "--textFile", "text",
            "--exportRuntime",
            "--optimize",
            "--optimizeLevel", "3",
            "--runtime", "incremental",
            "--runPasses", "asyncify"
        ];
        
        const sources = {
            'globals.ts': globalWASM,
            'json.ts': jsonWASM,
            'input.ts': contractSource,
        }
        asc.main(argv.concat(Object.keys(sources)), {
            stdout: output.stdout,
            stderr: output.stderr,
            transforms: [asBindTransform.default],
            readFile: name => Object.prototype.hasOwnProperty.call(sources, name) ? sources[name] : null,
            writeFile: (name, contents) => { output[name] = contents; },
            listFiles: () => []
        });
        return output;
    }

    getWASM(contractHash: string, contractSource: string) {
        const moduleBinary = this.compileString(contractSource);
        console.log(moduleBinary.stderr.toString())
        return moduleBinary.binary;
    }

    meteredWasm(contractHash, wasm) {
        if(this.wasm.has(contractHash)) { 
            return this.wasm.get(contractHash);
        } else {
            const meteredWasm = metering.meterWASM(wasm, {
                meterType: 'i32'
            });

            this.wasm.set(contractHash, wasm);

            return meteredWasm;
        }
    }

    async getModule(address, contractHash, wasm) {
        if(this.modules.has(contractHash)) {
            //return this.modules.get(contractHash);
        }
        
        // Cache for Metered WASM
        const meteredWasm = this.meteredWasm(contractHash, wasm);

        const limit = 90000000;
        let gasUsed = 0;

        const module = await AsBind.instantiate(meteredWasm, {
            'metering': {
                'usegas': (gas) => {
                    //@Todo set gas based on instantiating call
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

        this.modules.set(contractHash, module);

        return module;
    }

    async callContract(address: string, contractHash: string, wasm: string, payload: { params: string[], method: string }) {
        const module = await this.getModule(address, contractHash, wasm);
        const functionName = (module.exports[payload.method] as any);
        const result = await functionName(...payload.params);
        return result;
    }
}