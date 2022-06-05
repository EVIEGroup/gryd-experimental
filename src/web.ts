import { NodeService } from "./services/node.service";
import { v4 as uuidv4 } from 'uuid';
import all from 'it-all';
import Room from 'ipfs-pubsub-room';

import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string';
import { toString as uint8ArrayToString } from 'uint8arrays/to-string';

import { create } from 'ipfs-core';
import { Crypto } from "./helpers/crypto";

const WS = require('libp2p-websockets');
const filters = require('libp2p-websockets/src/filters')

// Shim hrtime
if(!process.hrtime) {
    process.hrtime = require('browser-process-hrtime');
}

async function test2() {

    const transportKey = WS.prototype[Symbol.toStringTag]
    const node = await create({
        // repo: String(Math.random() + Date.now()),
        init: { algorithm: 'Ed25519' },
        relay: {
          enabled: true, // enable relay dialer/listener (STOP)
          hop: {
            enabled: true // make this node a relay (HOP)
          }
        },
        EXPERIMENTAL: { ipnsPubsub: true },
        libp2p: {
          config: {
            transport: {
            //   // This is added for local demo!
            //   // In a production environment the default filter should be used
            //   // where only DNS + WSS addresses will be dialed by websockets in the browser.
            //   [transportKey]: {
            //     filter: filters.all
            //   }
            }
          }
        }
    });

    // const id = await node.id();
    const topic = 'test';

    const room = new Room(node, topic);
    room.on('subscribed',() => {
        console.log('SUBSCRIBED');
    });
    room.on('peer joined', (cid) => {
        console.log('PEER', cid);
    })
    room.on('message', (message) => {
        console.log('MSG', message)
    })



    setInterval(async () => {
        //room.broadcast('TEST');
        // console.log(await node.swarm.peers())

        const { cid } = await node.add('should put a value to the DHT');
        const publish = await node.name.publish(cid)
        let record

        for await (const event of node.dht.get(`/ipns/${publish.name}`)) {
            if (event.name === 'VALUE') {
                record = event.value
                break
            }
        }
        console.log(uint8ArrayToString(record));
        const events = await all(node.dht.put(`/ipns/${publish.name}`, record))
        const peerResponse = events.filter(event => event.name === 'PEER_RESPONSE').pop()
  
        if (!peerResponse || peerResponse.name !== 'PEER_RESPONSE') {
          throw new Error('Did not get peer response')
        }
  
        console.log(peerResponse);

    }, 1000);
};


const contractCode = `
class Test2 {

}

class Test extends Test2 {
    test(i: i32): string {
        const adds: string = address();
        const randomS: string = random();
        // return randomS;
        const updatedState = updateState("TEST", i.toString());
        //log("UPDATED STATE", updatedState);
        const theState = getState("TEST");
        // log("GET STATE", theState);
        return theState;
    }

    test2(i: i32): string {
        const primObj: JSON.Obj = JSON.Value.Object();
        primObj.set("Str", JSON.from("Hello"));
        let childObj = JSON.Value.Object();
        childObj.set("Test", JSON.from(address()));
        primObj.set("Obj", childObj);

        // Or get serialized data as string
        let jsonString: string = primObj.stringify();

        return jsonString;
    }
}

const testClass = new Test();

export function main(i: i32): string {
    return testClass.test(i);
}

export function test(i: i32): string {
    return testClass.test2(i);
}

`;

//test2();

test(0);
// test(1, null);

let responses: Array<number> = [];
let length = 0;

//let deployedHash = '0a1d7cbf28bf6211705d46920c07d5d44ca6358e13fb11a8b658c240d454b617';

async function test(i) {
    const node = new NodeService();
    await node.start(i, true);

    const deployedHash = await node.deployContract(contractCode);

    console.log('HASH', deployedHash);


    const callContract2 = await node.callContract(i.toString(), deployedHash, {
        method: 'main',
        params: [ i ]
    });

    console.log('Contract Call', callContract2);

    return;

    node.node.pubsub.subscribe("announce-circuit");
    node.node.pubsub.on("announce-circuit", (msg) => {
        const message = uint8ArrayToString(msg.data);
        //console.log(msg, message);
        // node.node.pubsub.publish("announce-circuit", uint8ArrayFromString("peer-alive"));
    });

    node.node.pubsub.subscribe(deployedHash);
    node.node.pubsub.on(deployedHash, (msg) => {
        console.log(msg.topicIDs, uint8ArrayToString(msg.data));
    });

    setInterval(() => {
        //node.node.pubsub.publish(deployedHash, uint8ArrayFromString("test"));
        node.node.pubsub.publish("announce-circuit", uint8ArrayFromString("peer-alive"));
    }, 5000);

    setInterval(async () => {
        try {
        const s = await node.node.contentRouting.get(uint8ArrayFromString(deployedHash));
        console.log('ZZZ', s);
        } catch(e) {

        }
        // await node.node.pubsub.publish(deployedHash, uint8ArrayFromString(JSON.stringify({ lol: true })));
    }, 1000);

    const callContract = await node.callContract(i.toString(), deployedHash, {
        method: 'test',
        params: [ i ]
    });



    // for(let j = 0; j < 1; j++) {
    //     setInterval(async () => {
    //         const start = process.hrtime();
    //         const callContract = await node.callContract(i.toString(), deployedHash, {
    //             method: 'main',
    //             params: [ i ]
    //         });
    //         var elapsed = process.hrtime(start)[1] / 1000000;
    //         responses.push(elapsed);
    //         // console.log(JSON.parse(callContract));
    //         // console.log(elapsed);
    //     }, 0);
    // }
}

// @ts-ignore()
window.test = test;
//document.body.innerHtml