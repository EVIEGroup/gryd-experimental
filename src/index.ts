import { NodeService } from "./services/node.service";
import { v4 as uuidv4 } from 'uuid';
//const blockchain = new BlockchainService();
//console.log(blockchain.getLastBlock());
const contractCode = `

@external("console", "log")
declare function log(value: string): void;

@external("process", "address")
declare function address(): string;

@external("process", "value")
declare function numberValue(): i32;

@external("process", "contractAddress")
declare function contractAddress(): string;

class Test2 {

}

export default class Test extends Test2 {
    test(i: i32): i32 {
        // const adds: string = address();
        // log(adds);

        const currentState: i32 = numberValue();
        const newState: i32 = currentState + 1;

        return newState;
    }
}
`;

let responses: Array<number> = [];
let length = 0;

for(let i = 0; i < 2; i++) {
    test(i);
}


let deployedHash = null;

async function test(i) {
    const node = new NodeService();
    await node.start(i, true);

    if(!deployedHash) {
        deployedHash = await node.deployContract(contractCode);
    }

    console.log(deployedHash);

    setInterval(async () => {
        const start = process.hrtime();
        const callContract = await node.callContract(i.toString(), deployedHash, {
            method: 'test',
            params: [ i ]
        });
        var elapsed = process.hrtime(start)[1] / 1000000;
        responses.push(elapsed);
        // console.log(elapsed);
    }, 0);


    setInterval(async () => {
        const start = process.hrtime();
        const callContract = await node.callContract(i.toString(), deployedHash, {
            method: 'test',
            params: [ i ]
        });
        var elapsed = process.hrtime(start)[1] / 1000000;
        responses.push(elapsed);
    }, 0);
}

setInterval(() => {
    const copiedResponses = [...responses];
    length += copiedResponses.length;
    if(copiedResponses.length > 0) {
        console.log(copiedResponses.reduce((a, b) => (a + b)) / copiedResponses.length, length);
        responses = [];
    }
}, 1000)