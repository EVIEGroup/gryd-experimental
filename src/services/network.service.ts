import signalhub from 'signalhub';
import { NetworkPeer } from './network/peer';
import { parseCandidate } from 'sdp';

export enum NATType {
    Undetermined = 'Undetermined',
    Normal = 'Normal',
    Symmetric = 'Symmetric'
}

export class NetworkService {
    natType: NATType = NATType.Undetermined;

    constructor(public isServer: boolean = false) { }

    async start() {
        //var hub = signalhub('app', 'localhost:9000')
        
        this.natType = await this.determineNAT();
        
        console.log('NAT Type', this.natType);

        const peer = new NetworkPeer();
        peer.start();
        console.log(peer);
    }
    
    async determineNAT() {
        return new Promise<NATType>((resolve, reject) => {
            const testPeer = new NetworkPeer();
            const candidates = [];
            const pc = testPeer._pc;
            pc.createDataChannel("networkAddressTranslationTest");
            pc.onicecandidate = function(e) {
                if (e.candidate && e.candidate.candidate.indexOf('srflx') !== -1) {
                    var cand = parseCandidate(e.candidate.candidate);
                    if (!candidates[cand.relatedPort]) candidates[cand.relatedPort] = [];
                    candidates[cand.relatedPort].push(cand.port);
                } else if (!e.candidate) {
                    if (Object.keys(candidates).length === 1) {
                        var ports = candidates[Object.keys(candidates)[0]];
                        const natType = ports.length === 1 ? NATType.Normal : NATType.Symmetric;
                        resolve(natType);
                    }
                }
            };
            pc.createOffer().then(offer => pc.setLocalDescription(offer)).catch(reject)
        });
    }
}