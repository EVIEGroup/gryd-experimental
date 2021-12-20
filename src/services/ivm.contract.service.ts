import ivm from 'isolated-vm';
import Libp2p from 'libp2p';
import { ContractService } from "./contract.service";
import ts from "typescript";

export class IVMContractService extends ContractService {
    vm: { jail: ivm.Reference, context: ivm.Context, isolate: ivm.Isolate, systemModule: ivm.Module, contractModule: ivm.Module };
    modules = new Map();

    constructor(protected node: Libp2p) {
        super(node, ts.ModuleKind.ES2022);
    }
    
    async createVM(address: string, contractHash: string, contract: string) {
        if(!this.vm) {
            const isolate = new ivm.Isolate({ memoryLimit: 8 });
            const context = await isolate.createContext();

            // Get a Reference{} to the global object within the context.
            const jail = context.global;

            await jail.set('global', jail.derefInto());

            // We will create a basic `log` function for the new isolate to use.
            await jail.set('log', function(...args) {
                console.log(...args);
            });

            await context.evalClosure(`global.getState = function(...args) {
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

            const systemModule = await isolate.compileModule(`
                import * as Contract from 'contract';
                export default function runContract(method, params) { const c = new Contract.default(); return c[method](...params); }
            `);

            const contractModule = await isolate.compileModule(contract, { filename: 'contract' });

            await contractModule.instantiate(context, ((specifier, referrer) => {
                // if(specifier === 'http-service') {
                //     return { HttpService };
                // }
            }) as any);
            await contractModule.evaluate();
            
            await systemModule.instantiate(context, ((specifier, referrer) => {
                if(specifier === 'contract') {
                    return contractModule;
                }
            }) as any);
            await systemModule.evaluate();
            
            this.vm = { isolate, context, jail, systemModule, contractModule };
        }

        // Process
        await this.vm.jail.set('process', { title: 'Decentranet', contract: contractHash, address: address }, { copy: true });

        return this.vm;
    }

    async callContract(address: string, contractHash: string, contract: string, payload: { params: string[], method: string }) {
        const { isolate, context, jail, contractModule, systemModule } = await this.createVM(address, contractHash, contract);

        const systemReference = systemModule.namespace;
		const result = await (await systemReference.get('default', { reference: true })).apply(null, [payload.method, payload.params], { arguments: { copy: true }, result: { promise: true }});

        // contractModule.release();
        // systemModule.release();
        // context.release();
        // isolate.dispose();

        return result;
    }
}