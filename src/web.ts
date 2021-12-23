// import asc from 'assemblyscript/cli/asc';
import { NodeService } from "./services/node.service";
import { v4 as uuidv4 } from 'uuid';

// Shim hrtime
if(!process.hrtime) {
    process.hrtime = require('browser-process-hrtime');
}

test('', null);

let responses: Array<number> = [];
let length = 0;

let deployedHash = '56a9da545821b30ace569309da10082c2ad738f7b3d6a17b12b45480a6c59cce';

async function test(i, asc) {
    const node = new NodeService();
    await node.start(i, asc, true);

    console.log(deployedHash);

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