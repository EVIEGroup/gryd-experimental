import Libp2p from 'libp2p';
import { NodeConfig } from '../config/node';
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string';
import { toString as uint8ArrayToString } from 'uint8arrays/to-string';
import { Crypto } from '../helpers/crypto';
import { IVMContractService } from './ivm.contract.service';
import { VM2ContractService } from './vm2.contract.service';
import { v4 as uuidv4 } from 'uuid';
import { WASMContractService } from './wasm.contract.service';

export class NodeService {
    contractService: IVMContractService | VM2ContractService | WASMContractService;
    ready: boolean = false;
    node: Libp2p;
    contracts = new Map();

    constructor() {
    }

    async start(id, full: boolean) {
       return new Promise<void>(async (resolve, reject) => {
        this.node = await Libp2p.create(await NodeConfig(id, '/ip4/0.0.0.0/tcp/0'));
        this.contractService = new WASMContractService(this.node); // full ? new IVMContractService(this.node) : new VM2ContractService(this.node);
        this.node.on('peer:discovery', async (peerId) => {
            //console.log('Discovered:', peerId.toB58String()); 
            //await this.wait(2000); 
        });
        await this.node.loadKeychain();
        await this.node.start();

        console.log(await this.node.keychain.listKeys());
        this.ready = true;
        resolve(); 
       });
    }

    async deployContract(script: string) {
        const hash = Crypto.hash(uuidv4());
        let existingContract = null;

        try {
            existingContract = await this.node.contentRouting.get(hash);
        } catch(e) { }
        
        if(!existingContract) {
            try {
                await this.node.contentRouting.put(hash, uint8ArrayFromString(script));
            } catch(e) {
                await this.wait(1000);
                return await this.deployContract(script);
            }
        }

        return hash.toString('hex');
    }

    async callContract(address: string, hash: string, payload: { method: string, params: string[] }) {
        if(this.ready) {
            const contractValue = await this.setupContract(hash);
            return await this.contractService.callContract(address, hash, contractValue, payload);
        } else {
            throw new Error('Node not ready, have not found any peers');
        }
    }

    async setupContract(hash: string) {
        if(!this.contracts.has(hash)) {
            this.contracts.set(hash, null);

            const message = await this.node.contentRouting.get(Buffer.from(hash, 'hex'));
            this.node.pubsub.on(hash, (msg) => {
                //console.log(msg.from == this.node.peerId.toB58String());
                //console.log(JSON.parse(uint8ArrayToString(msg.data)));
            });

            await this.node.pubsub.subscribe(hash);

            // console.log('SUBSCRIBED TO', hash);
            
            const value = uint8ArrayToString(message.val);
            const compiledScript: string = this.contractService.compile(value);
            this.contracts.set(hash, compiledScript);

            return compiledScript;
        } else {
            const contractCode = this.contracts.get(hash);

            if(!contractCode) {
                await this.wait(1000);
                return await this.setupContract(hash);   
            } else {
                return contractCode;
            }
        }
    }
    
    async wait(ms: number) {
        return new Promise<void>((resolve, reject) => {
            setTimeout(() => { resolve() }, ms);
        });
    }
}