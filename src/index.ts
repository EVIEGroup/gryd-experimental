import { NodeService } from "./services/node.service";
import { v4 as uuidv4 } from 'uuid';
//const blockchain = new BlockchainService();
//console.log(blockchain.getLastBlock());
const contractCode = `
//import { HttpService } from 'http-service';
// import { Crypto } from 'crypto';

class Test2 {
    j = 0;
    testJ() {
       return this.j++;
    }
}

export default class Test extends Test2 {
    async test(i) {
        const currentState = await getState('increment'+i);
        const newState = typeof currentState === 'number' ? currentState + 1 : 1;
        await updateState('increment'+i, newState);

        return newState;
    }
}
`;

for(let i = 0; i < 2; i++) {
    test(i);
}

async function test(i) {
    const node = new NodeService();
    await node.start(i);

    const deployedHash = await node.deployContract(contractCode);

    setInterval(async () => {
        const times = Math.random();
        console.time(times.toString());
        const callContract = await node.callContract(i.toString(), deployedHash, {
            method: 'test',
            params: [ i ]
        });

        console.timeEnd(times.toString());
        console.log('i:'+i, callContract);
    }, 30);
}