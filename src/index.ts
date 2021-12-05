import { WorkerService } from "./services/worker.service";
import { Crypto } from "./helpers/crypto";
import { v4 as uuidv4 } from 'uuid';

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
    test() {
        //console.log(process);
        //console.log('Test2', HttpService.constructor);
        //console.log('Test', new HttpService('lol').run());
        const currentState = getState('increment');
        const newState = typeof currentState === 'number' ? currentState + 1 : 1;
        updateState('increment', newState);

        //return Crypto.createKeyPair('lol').publicKey;

        return newState;
    }

    test2() {
        return getState('increment');
    }
}

//console.log(this);
`;

const worker = new WorkerService(uuidv4());

const deployedHash = worker.contractService.deploy(contractCode);

worker.test('test');