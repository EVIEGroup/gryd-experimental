import { NodeService } from "./services/node.service";

//const blockchain = new BlockchainService();
//console.log(blockchain.getLastBlock());
const contractCode = `
import { HttpService } from 'http-service';
import { Crypto } from 'crypto';

class Test2 {
    j = 0;
    testJ() {
        return this.j++;
    }
}

export default class Test extends Test2 {
    async test() {
        //console.log(process);
        //console.log('Test2', HttpService.constructor);
        //console.log('Test', new HttpService('lol').run());
        const currentState = await getState('increment');
        console.log('LOL', currentState);
        const newState = typeof currentState === 'number' ? currentState + 1 : 1;
        updateState('increment', newState);
        console.log('LOL2', newState);

        //return Crypto.createKeyPair('lol').publicKey;

        return newState;
    }

    test2() {
        return getState('increment');
    }
}

//console.log(this);
`;

// worker.test();

test();

async function test() {
    const node = new NodeService();
    await node.start();

    const deployedHash = await node.deployContract(contractCode);
    const callContract = await node.callContract(deployedHash, {
        method: 'test',
        params: []
    });
    console.log(callContract);
}