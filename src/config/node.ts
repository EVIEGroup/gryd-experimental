import WebRTCStar from 'libp2p-webrtc-star';
import WebSocket from 'libp2p-websockets';
import filters from 'libp2p-websockets/src/filters'
import MPLEX from 'libp2p-mplex';
import { NOISE } from '@achingbrain/libp2p-noise';
import DHT from 'libp2p-kad-dht';
import GossipSub from 'libp2p-gossipsub';
import Bootstrap from 'libp2p-bootstrap';
import { Libp2pOptions } from 'libp2p';
import { LevelDatastore } from 'datastore-level';
import wrtc from 'wrtc';
import { Multiaddr } from 'multiaddr';
import PeerId from 'peer-id';


export async function NodeConfig(id, isClient) {
    const listen = [
        // Add the signaling server multiaddr
        // '/dns4/star.thedisco.zone/tcp/9090/wss/p2p-webrtc-star',
        // '/dns6/star.thedisco.zone/tcp/9090/wss/p2p-webrtc-star',
        //'/dns4/web3-star.herokuapp.com/tcp/443/wss/p2p-webrtc-star/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm',
    ];

    //if(!isClient) {
        listen.push('/ip4/127.0.0.1/tcp/13579/wss/p2p-webrtc-star');
    //}

    const dataDir = 'stores/data'+id;
    const datastore = new LevelDatastore(dataDir);
    await datastore.open();

    const keyDir = 'stores/key'+id;
    const keystore = new LevelDatastore(keyDir);
    await keystore.open();

    const wRTCTransportKey = WebRTCStar.prototype[Symbol.toStringTag];
    const wsTransportKey = WebSocket.prototype[Symbol.toStringTag];

    // const boostrap1 = new Multiaddr('/dns6/ipfs.thedisco.zone/tcp/4430/wss/p2p/12D3KooWChhhfGdB9GJy1GbhghAAKCUR99oCymMEVS4eUcEy67nt');
    // const boostrap2 = new Multiaddr('/dns4/ipfs.thedisco.zone/tcp/4430/wss/p2p/12D3KooWChhhfGdB9GJy1GbhghAAKCUR99oCymMEVS4eUcEy67nt');

    return {
        datastore: datastore,
        addresses: {
            listen: listen
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
                WebSocket,
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
                [wRTCTransportKey]: {
                    wrtc,
                },
                [wsTransportKey]: {
                  // by default websockets do not allow localhost dials
                  // let's enable it for testing purposes in this example
                  filter: filters.all
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
                    list: [
                        // '/dns6/ipfs.thedisco.zone/tcp/4430/wss/p2p/12D3KooWChhhfGdB9GJy1GbhghAAKCUR99oCymMEVS4eUcEy67nt',
                        // '/dns4/ipfs.thedisco.zone/tcp/4430/wss/p2p/12D3KooWChhhfGdB9GJy1GbhghAAKCUR99oCymMEVS4eUcEy67nt'
                    ]
                },
            },
            dht: {
                enabled: true,
                clientMode: true,
                kBucketSize: 20,
                // bootstrapPeers: [
                //     {
                //         id: PeerId.createFromB58String('12D3KooWChhhfGdB9GJy1GbhghAAKCUR99oCymMEVS4eUcEy67nt'),
                //         multiaddrs: [boostrap1]
                //     },
                //     {
                //         id: PeerId.createFromB58String('12D3KooWChhhfGdB9GJy1GbhghAAKCUR99oCymMEVS4eUcEy67nt'),
                //         multiaddrs: [boostrap2]
                //     },
                // ]
                // randomWalk: {
                //     enabled: true,
                // },
                // validators: {
                //     hello: {
                //       func: async (key, publicKey) => {
                //         console.log(key, publicKey);
                //       },
                //       sign: false
                //     }
                // },
                // selectors: {
                //     hello: (key, records) => {
                //         console.log(key, records);
                //         return 0;
                //     },
                // }
            },
            relay: {            // Circuit Relay options (this config is part of libp2p core configurations)
                enabled: true,           // Allows you to dial and accept relayed connections. Does not make you a relay.
                hop: {
                  enabled: true,         // Allows you to be a relay for other peers
                  active: true           // You will attempt to dial destination peers if you are not connected to them
                },
            },
            pubsub: {
                enabled: true,
                // emitSelf: false,
                // globalSignaturePolicy: SignaturePolicy.StrictSign,
                // messageProcessingConcurrency: 20,
                // canRelayMessage: true
            },
            nat: {
                enabled: true,
                pmp: {
                    enabled: true,
                },
                description: `gryd` //@${os.hostname()}`
            },
        },
        metrics: {
            enabled: true
        },
        peerStore: {
            persistence: true
        }
    } as Libp2pOptions;
}