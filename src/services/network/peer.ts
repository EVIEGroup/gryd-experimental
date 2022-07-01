
import wrtc from 'wrtc';

export class NetworkPeer {
    _pc: wrtc.RTCPeerConnection;
    _dc: wrtc.RTCDataChannel;
    _config: any = {
        iceServers: [
            {urls: 'stun:stun1.l.google.com:19302'},
            {urls: 'stun:stun2.l.google.com:19302'},
            {
                urls: "turn:openrelay.metered.ca:80",
                username: "openrelayproject",
                credential: "openrelayproject",
            },
            {
                urls: "turn:openrelay.metered.ca:443",
                username: "openrelayproject",
                credential: "openrelayproject",
            },
            {
                urls: "turn:openrelay.metered.ca:443?transport=tcp",
                username: "openrelayproject",
                credential: "openrelayproject",
            },
        ],
        sdpSemantics: 'unified-plan'
    }

    constructor() {
      this._pc = new (wrtc.RTCPeerConnection)(this._config);
    }

    start() {
        const pc = this._pc;
        pc.ondatachannel = e => {
            this._dc = e.channel;
            const dc = this._dc;
            dc.onopen = e => (dc.send("Hi!"));
            dc.onmessage = e => console.log(e.data);
        }        
        pc.ondatachannel({ channel: pc.createDataChannel("chat") });
        pc.onicecandidate = e => {
            if (e.candidate) return;
            console.log(JSON.stringify(pc.localDescription))
        };
    }

    createOffer() {
        const pc = this._pc;
        pc.createOffer().then(d => pc.setLocalDescription(d)).catch(console.log);
    }

    createAnswer(offer) {
        const pc = this._pc;
        pc.setRemoteDescription(new RTCSessionDescription(offer))
        .then(() => pc.createAnswer()).then(d => pc.setLocalDescription(d))
        .catch(console.log);
    }

    setAnswer(answer) {
        const pc = this._pc;
        pc.setRemoteDescription(new RTCSessionDescription(answer)).catch(console.log);
    }
}