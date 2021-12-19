import ts from "typescript";
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string';
import { toString as uint8ArrayToString } from 'uint8arrays/to-string';
import Libp2p from 'libp2p';
import { v4 as uuidv4 } from 'uuid';

import ivm from 'isolated-vm';

export class ContractService {
    vm: { jail: ivm.Reference, context: ivm.Context, isolate: ivm.Isolate };
    modules = [];

    constructor(protected node: Libp2p) {}

    createVM(contractHash: string) {
        if(!this.vm) {
            const isolate = new ivm.Isolate({ memoryLimit: 128 });
            const context = isolate.createContextSync();

            // Get a Reference{} to the global object within the context.
            const jail = context.global;

            jail.setSync('global', jail.derefInto());

            // We will create a basic `log` function for the new isolate to use.
            jail.setSync('log', function(...args) {
                console.log(...args);
            });

            context.evalClosureSync(`global.getState = function(...args) {
                return $0.apply(undefined, args, { resolve: true, result: { promise: true }, arguments: { copy: true } });
            }; global.updateState = function(...args) {
                return $1.apply(undefined, args, { resolve: true, result: { promise: true }, arguments: { copy: true } });
            };`, [
                async (key: string) => {
                    const res = await this.getState(contractHash, key);
                    return res;
                },
                async (key: string, value: any) => {
                    return await this.updateState(contractHash, key, value)
                }
            ], {
                arguments: {
                    reference: true
                }
            });
            
            this.vm = { isolate, context, jail };
        }

        // This makes the global object available in the context as `global`. We use `derefInto()` here
        // because otherwise `global` would actually be a Reference{} object in the new isolate.
        this.vm.jail.setSync('global', this.vm.jail.derefInto());

        return this.vm;
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
                run();
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
        const res = ts.transpileModule(script, { reportDiagnostics: true, compilerOptions: { module: 7 } });
        return res.outputText; //new VMScript(res.outputText);
    }
    
    async callContract(address: string, contractHash: string, contract: string, payload: { params: string[], method: string }) {
        const { isolate, context, jail } = this.createVM(contractHash);

        jail.setSync('process', { title: 'Decentranet', contract: contractHash, address: address }, { copy: true });

        const contractModule = await isolate.compileModule(contract, { filename: 'contract' });
        await contractModule.instantiate(context, ((specifier, referrer) => {
            // if(specifier === 'http-service') {
            //     return { HttpService };
            // }
        }) as any);
		await contractModule.evaluate();

        const systemModule = await isolate.compileModule(`
            import * as Contract from 'contract';
            export default function runContract(method, params) { const c = new Contract.default(); return c[method](...params); }
        `);
        await systemModule.instantiate(context, ((specifier, referrer) => {
            if(specifier === 'contract') {
                return contractModule;
            }
        }) as any);
		await systemModule.evaluate();

        const systemReference = systemModule.namespace;
		const result = await (await systemReference.get('default', { reference: true })).apply(null, [payload.method, payload.params], { arguments: { copy: true }, result: { promise: true }});
        
       // console.log('ZZZZZZZZ-', isolate.cpuTime, isolate.getHeapStatisticsSync().externally_allocated_size / 8 / 1024);

        contractModule.release();
        systemModule.release();
        // jail.release();
        // isolate.dispose();

        return result;
    }
}