
import { ContractService } from './contract.service';
import { Crypto } from '../helpers/crypto';
import Libp2p from 'libp2p';
import TCP from 'libp2p-tcp';
import MPLEX from 'libp2p-mplex';
import { NOISE } from '@achingbrain/libp2p-noise';
import DHT from 'libp2p-kad-dht';
import MDNS from 'libp2p-mdns';
import GossipSub from 'libp2p-gossipsub';
import Bootstrap from 'libp2p-bootstrap';
import os from 'os';
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string');
const { toString: uint8ArrayToString } = require('uint8arrays/to-string');

export class WorkerService {
    contractService: ContractService;
    keyPair: { publicKey: Buffer, secretKey: Buffer }
    peers = new Set();
    messages = new Map();

    constructor(seed: string) {
        this.keyPair = Crypto.createKeyPair(Crypto.hash(seed));
        this.contractService = new ContractService();
    }

    async test(discoveryKey: string) {
      const [node1, node2] = await Promise.all([
        this.createNode(1),
        this.createNode(2),
      ])
    
      node1.on('peer:discovery', (peerId) => console.log('Discovered:', peerId.toB58String()))
      node2.on('peer:discovery', (peerId) => console.log('Discovered:', peerId.toB58String()))
    
      await Promise.all([
        node1.start(),
        node2.start()
      ])

      node1.pubsub.on('test', (msg) => {
        console.log(msg);
        console.log(`node1 received: ${uint8ArrayToString(msg.data)}`)
      })
      await node1.pubsub.subscribe('test');

      node2.pubsub.on('test', (msg) => {
        console.log(msg);
        console.log(`node2 received: ${uint8ArrayToString(msg.data)}`)
      })
      await node2.pubsub.subscribe('test');

      // node2 publishes "news" every second
      setInterval(() => {
        node2.pubsub.publish('test', uint8ArrayFromString('Bird bird bird, bird is the word!'))
      }, 1000)
    }

    async createNode(i: number) {
      const port = Math.round(Math.random() * 1000 + 10000);
      const node = await Libp2p.create({
        addresses: {
          listen: ['/ip4/0.0.0.0/tcp/'+port]
        },
        dialer: {
          maxParallelDials: 150, // 150 total parallel multiaddr dials
          maxDialsPerPeer: 4, // Allow 4 multiaddrs to be dialed per peer in parallel
          dialTimeout: 10e3 // 10 second dial timeout per peer dial
        },
        modules: {
          transport: [
            TCP,
          ],
          streamMuxer: [
            MPLEX
          ],
          connEncryption: [
            NOISE
          ],
          peerDiscovery: [
            MDNS,
            Bootstrap,
          ],
          dht: DHT,
          pubsub: GossipSub
        },
        config: {
          peerDiscovery: {
            //autoDial: true,
            [MDNS.tag]: {
              interval: 20e3,
              enabled: true
            },
            // Optimization
            // Requiring bootstrap inline in components/libp2p to reduce the cli execution time
            [Bootstrap.tag]: {
              enabled: false,
              list: [
                //'/ip4/127.0.0.1/tcp/10986'
              ]
            }
          },
          dht: {
            kBucketSize: 20,
            enabled: true,
            clientMode: true,
            // validators: {
            //   ipns: validator
            // },
            // selectors: {
            //   ipns: selector
            // }
          },
          pubsub: {
            enabled: true,
            emitSelf: true
          },
          nat: {
            enabled: true,
            description: `decentranet@${os.hostname()}`
          }
        },
        metrics: {
          enabled: true
        },
        peerStore: {
          persistence: true
        }
      } as any);

      // node.on('peer:discovery', (peer) => {
      //   console.log('Discovered %s', peer.id.toB58String()) // Log discovered peer
      // })

      //await node.start();
      
      return node;
    }
    
    async wait(ms: number) {
      return new Promise<void>((resolve, reject) => {
        setTimeout(() => { console.log('Time'); resolve() }, ms);
      });
    }
}