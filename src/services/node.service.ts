
import { ContractService } from './contract.service';
import Libp2p from 'libp2p';
import { NodeConfig } from '../config/node';
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string';
import { toString as uint8ArrayToString } from 'uint8arrays/to-string';
import { Crypto } from '../helpers/crypto';
import { VMScript } from 'vm2';

export class NodeService {
    contractService: ContractService;
    ready: boolean = false;
    node: Libp2p;

    constructor() {
    }

    async start() {
       return new Promise<void>(async (resolve, reject) => {
        this.node = await Libp2p.create(NodeConfig('/ip4/0.0.0.0/tcp/0'));
        this.contractService = new ContractService(this.node);
        this.node.on('peer:discovery', async (peerId) => { 
            console.log('Discovered:', peerId.toB58String()); 
            await this.wait(500); 
            this.ready = true;
            resolve(); 
        });
        await this.node.start();
       });
    }

    async deployContract(script: string) {
        const compiledScript: VMScript = this.contractService.compile(script);
        const hash = Crypto.hash(compiledScript.code);
        await this.node.contentRouting.put(hash, uint8ArrayFromString(compiledScript.code));
        return hash.toString('hex');
    }

    async callContract(hash: string, payload: { method: string, params: string[] }) {
        if(this.ready) {
            await this.node.pubsub.subscribe(hash);
            this.node.pubsub.on(hash, (msg) => {
                console.log('RECEIVED MESSAGE: ', uint8ArrayToString(msg.data));
            });
            const message = await this.node.contentRouting.get(Buffer.from(hash, 'hex'));
            const value = uint8ArrayToString(message.val);

            const contract = this.contractService.compile(value);
            const contractResponse = this.contractService.callContract(hash, contract, payload);

            return contractResponse;
        } else {
            throw new Error('Node not ready, have not found any peers');
        }
    }


    // deploy(script: string) {
    //     const hash = Crypto.hash(script);
    //     let compiledScript: VMScript = this.compile(script);
    //     this.hashes.set(hash, new (this.vm.run(compiledScript)).default);
    //     return hash;
    // }
    
    // callContract(payload: { hash: string, params: any, method: string }) {
    //     const deploymentClass = this.find(payload.hash);
    //     const methodParams = payload.params ? payload.params : [];
    //     const response = deploymentClass[payload.method](...methodParams);
    //     return response;
    // }
    
    async wait(ms: number) {
        return new Promise<void>((resolve, reject) => {
            setTimeout(() => { resolve() }, ms);
        });
    }
}