import Libp2p from 'libp2p';
import { NodeConfig } from '../config/node';
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string';
import { toString as uint8ArrayToString } from 'uint8arrays/to-string';
import { Crypto } from '../helpers/crypto';
import { v4 as uuidv4 } from 'uuid';
import { WASMContractService } from './wasm.contract.service';
import { Connection } from 'libp2p/src/connection-manager';
import { getCleanMultiaddr } from 'libp2p/src/identify';
import { CID } from 'multiformats/cid'

export class NodeService {
    contractService: WASMContractService;
    ready: boolean = false;
    node: Libp2p;
    contracts = new Map();
    isClient: boolean = false;
    
    constructor() {
        
    }

    async start(id, isClient) {
       this.isClient = isClient;
       return new Promise<void>(async (resolve, reject) => {
           try {
                this.node = await Libp2p.create(await NodeConfig(id, isClient));
                this.contractService = new WASMContractService(this.node);
                this.node.connectionManager.on('peer:connect', async (connection: Connection) => {
                    try {
                        // console.log('\n \n Connection established to:', connection.remotePeer.toB58String());
                        if(!this.ready) {
                            const interval = setInterval(() => {
                                if(this.node.isStarted() && this.node._dht.isStarted()) {
                                    clearInterval(interval);
                                    this.ready = true;
                                    resolve();
                                    console.log('READY');
                                } else {
                                    console.log('NOT READY');
                                }
                            }, 100);
                        }
                    } catch(e) {
                        
                    }
                })
                await this.node.loadKeychain();
                await this.node.start();

                console.log(await this.node.keychain.listKeys());
                // resolve(); 
            } catch(e) {
                reject(e);
            }
       });
    }

    async deployContract(script: string) {
        const hash = Crypto.hash(uuidv4());
        let existingContract = null;

        try {
            //existingContract = await this.node.contentRouting.get(hash);
            //console.log(existingContract);
        } catch(e) { }
        
        if(!existingContract) {
            try {
                const wasm = this.contractService.getWASM(hash.toString('hex'), script);
                // await this.node.contentRouting.provide(CID.createV0(new MultihashDi));
                await this.node.contentRouting.put(hash, wasm, {
                    minPeers: 1
                });

            } catch(e) {
                
                //console.log(Object.values(this.node.contentRouting.dht._wan._peerRouting._routingTable as any));
                // console.log(this.node.contentRouting.dht._wan);
                // console.log(e, this.node.contentRouting.dht);
                await this.wait(1000);
                console.log(e);
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
            try {
                const message = await this.node.contentRouting.get(Buffer.from(hash, 'hex'));
                this.contracts.set(hash, null);
                
                this.node.pubsub.on(hash, (msg) => {
                    //console.log(msg.from == this.node.peerId.toB58String());
                    console.log(JSON.parse(uint8ArrayToString(msg.data)));
                });
    
                await this.node.pubsub.subscribe(hash);
    
                console.log('SUBSCRIBED TO', hash);
                const value = message.val;
                this.contracts.set(hash, value);

                return value;
            } catch(e) {
                return await this.setupContract(hash);
            }
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