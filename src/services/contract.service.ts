
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string';
import { toString as uint8ArrayToString } from 'uint8arrays/to-string';
import asm from "assemblyscript";
import asc from "assemblyscript/cli/asc";

import Libp2p from 'libp2p';
import ts from "typescript";

export abstract class ContractService {
    constructor(protected node: Libp2p, protected moduleCompilation: ts.ModuleKind) {
        console.log(this.constructor, this.moduleCompilation);
    }
    
    async updateState(contractHash: string, key: string, value: any) {
        // return 1;
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
                run();
            }
        };

        run();

        return value;
    }

    async getState(contractHash: string, key: string) {
        // return 1;
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
        if(this.moduleCompilation != ts.ModuleKind.None) {
            const res = ts.transpileModule(script, { reportDiagnostics: true, compilerOptions: { module: this.moduleCompilation } });
            return res.outputText;
        } else {
            return script;
        }
    }

    compileWasm(script: string) {
        const res = ts.transpileModule(script, { reportDiagnostics: true, compilerOptions: { module: this.moduleCompilation } });
        const output: any = asc.compileString(script, { optimizeLevel: 0, measure: true, runtime:  "stub" }); // Do we want to compile webassembly instead?
        console.log('ZZZ', output.stderr.toString());
        return output;
    }
}