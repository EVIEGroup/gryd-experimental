import WebRTCStar from 'libp2p-webrtc-star';
import MPLEX from 'libp2p-mplex';
import { NOISE } from '@achingbrain/libp2p-noise';
import DHT from 'libp2p-kad-dht';
import GossipSub from 'libp2p-gossipsub';
import Bootstrap from 'libp2p-bootstrap';
import { Libp2pOptions } from 'libp2p';
import { LevelDatastore } from 'datastore-level';
import wrtc from 'wrtc';

export async function NodeConfig(id, listen) {
    const dataDir = 'stores/data'+id;
    const datastore = new LevelDatastore(dataDir);
    await datastore.open();

    const keyDir = 'stores/key'+id;
    const keystore = new LevelDatastore(keyDir);
    await keystore.open();

    const transportKey = WebRTCStar.prototype[Symbol.toStringTag]

    return {
        datastore: datastore,
        addresses: {
            listen: [listen]
        },
        keychain: {
            datastore: keystore,
        },
        dialer: {
            maxParallelDials: 150, // 150 total parallel multiaddr dials
            maxDialsPerPeer: 4, // Allow 4 multiaddrs to be dialed per peer in parallel
            dialTimeout: 10e3 // 10 second dial timeout per peer dial
        },
        modules: {
            transport: [
                //TCP,
                WebRTCStar,
            ],
            streamMuxer: [
                MPLEX
            ],
            connEncryption: [
                NOISE
            ],
            peerDiscovery: [
                //MDNS,
                Bootstrap,
            ],
            dht: DHT,
            pubsub: GossipSub
        },
        config: {
            transport: {
                [transportKey]: {
                    wrtc,
                }
            },
            peerDiscovery: {
                autoDial: true,
                // [MDNS.tag]: {
                //     interval: 20e3,
                //     enabled: true
                // },
                [WebRTCStar.tag]: {
                  enabled: true
                },
                // Optimization
                // Requiring bootstrap inline in components/libp2p to reduce the cli execution time
                [Bootstrap.tag]: {
                    enabled: false,
                    // list: [
                    //   '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
                    //   '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
                    //   '/dnsaddr/bootstrap.libp2p.io/p2p/QmZa1sAxajnQjVM8WjWXoMbmPd7NsWhfKsPkErzpm9wGkp',
                    //   '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
                    //   '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt'
                    // ]
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
                globalSignaturePolicy: 'StrictSign',
                messageProcessingConcurrency: 20,
                // canRelayMessage: true
            },
            nat: {
                enabled: true,
                description: `decentranet` //@${os.hostname()}`
            }
        },
        metrics: {
            enabled: false
        },
        peerStore: {
            persistence: true
        }
    } as Libp2pOptions;
}