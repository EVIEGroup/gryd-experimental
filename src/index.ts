import { WorkerService } from "./services/worker.service";
import { BlockchainService } from "./services/blockchain.service";

//const blockchain = new BlockchainService();
//console.log(blockchain.getLastBlock());

const worker = new WorkerService();
const deployedHash = worker.contractService.deploy(`
import { HttpService } from 'http-service';

class Test2 {
    j = 0;
    testJ() {
        return this.j++;
    }
}

export default class Test extends Test2 {
    i = 0;
    test() {
        //console.log(process);
        //console.log('Test2', HttpService.constructor);
        //console.log('Test', new HttpService('lol').run());
        const currentState = getState('increment');
        const newState = typeof currentState === 'number' ? currentState + 1 : 0;
        updateState('increment', newState);
        this.i++;

        return newState;
    }
}

//console.log(this);
`);

//console.log(deployedHash);

// { "type": "CALL", "hash": "adfaf7905d0be2e3bf1793b6a3b137082974ad2271b61ff3ab6bad4c4a80f424", "method": "test" }
// { "type": "CALL", "hash": "cd9db92030b411d2e2faed4cd899845b95935f2d22e9591472ffed69e9975701", "method": "test" }
// { "type": "DEPLOY", "data": "aW1wb3J0IHsgSHR0cFNlcnZpY2UgfSBmcm9tICdodHRwLXNlcnZpY2UnOwoKY2xhc3MgVGVzdDIgewogICAgaiA9IDA7CiAgICB0ZXN0SigpIHsKICAgICAgICByZXR1cm4gdGhpcy5qKys7CiAgICB9Cn0KCmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRlc3QgZXh0ZW5kcyBUZXN0MiB7CiAgICBpID0gMDsKICAgIHRlc3QoKSB7CiAgICAgICAgLy9jb25zb2xlLmxvZyhwcm9jZXNzKTsKICAgICAgICAvL2NvbnNvbGUubG9nKCdUZXN0MicsIEh0dHBTZXJ2aWNlLmNvbnN0cnVjdG9yKTsKICAgICAgICAvL2NvbnNvbGUubG9nKCdUZXN0JywgbmV3IEh0dHBTZXJ2aWNlKCdsb2wnKS5ydW4oKSk7CiAgICAgICAgY29uc3QgY3VycmVudFN0YXRlID0gZ2V0U3RhdGUoJ2luY3JlbWVudCcpOwogICAgICAgIGNvbnN0IG5ld1N0YXRlID0gdHlwZW9mIGN1cnJlbnRTdGF0ZSA9PT0gJ251bWJlcicgPyBjdXJyZW50U3RhdGUgKyAxIDogMDsKICAgICAgICB1cGRhdGVTdGF0ZSgnaW5jcmVtZW50JywgbmV3U3RhdGUpOwogICAgICAgIHRoaXMuaSsrOwoKICAgICAgICByZXR1cm4gbmV3U3RhdGU7CiAgICB9Cn0KCi8vY29uc29sZS5sb2codGhpcyk7" }