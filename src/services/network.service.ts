import signalhub from 'signalhub';
import swarm from '@corwin.amber/webrtc-swarm';
import wrtc from 'wrtc';

export class NetworkService {
    constructor(public isServer: boolean = false) { }

    start() {
        var hub = signalhub('app', 'localhost:9000')
        var networkSwarm = swarm(hub, {wrtc})
        var peerIds = {}

        networkSwarm.on('peer', function (peer, id) {
            peerIds[id] = peer;
            console.log(peerIds);
            peer.on('data', function (data) {
                console.log(id, peer, data);
            });
        });
    }
}