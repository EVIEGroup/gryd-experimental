import { Crypto } from '../helpers/crypto';
import { v4 as uuidv4 } from 'uuid';
import { WASMContractService } from './wasm.contract.service';
import { NetworkService } from './network.service';

export type NodeOptions = {
    server: boolean;
}

export class NodeService {
    contractService: WASMContractService;
    networkService: NetworkService;
    ready: boolean = false;
    contracts = new Map();
    
    constructor(public options: NodeOptions = { server: false }) {
        this.contractService = new WASMContractService();
        this.networkService = new NetworkService(options.server);
        console.log('OPT', options)
    }

    async start(id) {
        //@Todo - Start Node & Connect to Network Peers from Bootstrap

        await this.networkService.start();
        this.ready = true;
    }

    async deployContract(script: string) {
        const hash = await Crypto.hash(uuidv4());
        const wasm = this.contractService.getWASM(hash, script);

        //@Todo - Replicate Contract across network
        this.contracts.set(hash, wasm);

        return hash;
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
            //@Todo - Get from Network
            return null;
        } else {
            return this.contracts.get(hash);
        }
    }
}