import TCP from 'libp2p-tcp';
import MPLEX from 'libp2p-mplex';
import { NOISE } from '@achingbrain/libp2p-noise';
import DHT from 'libp2p-kad-dht';
import MDNS from 'libp2p-mdns';
import GossipSub from 'libp2p-gossipsub';
import Bootstrap from 'libp2p-bootstrap';
import os from 'os';
import { Libp2pOptions } from 'libp2p';

export function NodeConfig(listen) {
    return {
        addresses: {
            listen: [listen]
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
                //'/ip4/127.0.0.1/tcp/30001/p2p/QmX3pb5JkthsJQmmzXgqxKUonbMtmEqt3XqUKe68ihjcCm',
                ]
            },
            
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
                emitSelf: false,
                globalSignaturePolicy: 'StrictNoSign'
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
    } as Libp2pOptions;
}