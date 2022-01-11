import { ContractService } from "./contract.service";
import * as metering from 'wasm-metering';
import { v4 as uuidv4 } from 'uuid';
import { globalWASM } from "../wasm/globals";
import { jsonWASM } from "../wasm/json";
import * as utf8 from 'assemblyscript/cli/util/utf8';
import * as asBindTransform from 'as-bind/dist/transform.cjs';
import { ASCConfig }from '../config/asc';
import asc from 'assemblyscript/cli/asc';

const AsBind = require("as-bind/dist/as-bind.cjs.js");

export class WASMContractService extends ContractService {
    wasm = new Map;
    modules = new Map;

    constructor(node) {
        super(node);
    }

    /** Convenience function that parses and compiles source strings directly. */
    compileString(sources, options) {
        if (typeof sources === "string") sources = { [`input.ts`]: sources };
        const output = Object.create({
            stdout: this.createMemoryStream(),
            stderr: this.createMemoryStream()
        });
        var argv = [
            "--binaryFile", "binary",
            "--textFile", "text",
        ];
        Object.keys(options || {}).forEach(key => {
        var val = options[key];
        var opt = ASCConfig[key];
        if (opt && opt.type === "b") {
            if (val) argv.push(`--${key}`);
        } else {
            if (Array.isArray(val)) {
            val.forEach(val => { argv.push(`--${key}`, String(val)); });
            }
            else argv.push(`--${key}`, String(val));
        }
        });
        
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

    /** Creates a memory stream that can be used in place of stdout/stderr. */
    createMemoryStream(fn?) {
        var allocBuffer = typeof global !== "undefined" && global.Buffer
          ? global.Buffer.allocUnsafe || (len => new global.Buffer(len))
          : len => new Uint8Array(len);

        var stream = [] as any;
        stream.write = function(chunk) {
        if (fn) fn(chunk);
        if (typeof chunk === "string") {
            let buffer = allocBuffer(utf8.length(chunk));
            utf8.write(chunk, buffer, 0);
            chunk = buffer;
        }
        this.push(chunk);
        };
        stream.reset = function() {
        stream.length = 0;
        };
        stream.toBuffer = function() {
        var offset = 0, i = 0, k = this.length;
        while (i < k) offset += this[i++].length;
        var buffer = allocBuffer(offset);
        offset = i = 0;
        while (i < k) {
            buffer.set(this[i], offset);
            offset += this[i].length;
            ++i;
        }
        return buffer;
        };
        stream.toString = function() {
        var buffer = this.toBuffer();
        return utf8.read(buffer, 0, buffer.length);
        };
        return stream;
    }

    getWASM(contractHash: string, contract: string) {
        const moduleBinary = this.compileString({
            'globals.ts': globalWASM,
            'json.ts': jsonWASM,
            'input.ts': contract,
        }, {
            exportRuntime: true,
            // transform: [
            //     'as-bind',
            // ],
            optimize: true,
            optimizeLevel: 3,
            runtime: "incremental",
            runPasses: [
                'asyncify'
            ],
        } as any);

        const meteredWasm = metering.meterWASM(moduleBinary.binary, {
            meterType: 'i32'
        });

        return meteredWasm;
    }

    async getModule(address, contractHash, wasm) {
        const limit = 90000000;
        let gasUsed = 0;

        const module = await AsBind.instantiate(wasm, {
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