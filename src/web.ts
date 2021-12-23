// import asc from 'assemblyscript/cli/asc';
import { NodeService } from "./services/node.service";
import { v4 as uuidv4 } from 'uuid';

// Shim hrtime
if(!process.hrtime) {
    process.hrtime = require('browser-process-hrtime');
}

const contractCode = `
class Test2 {

}

class Test extends Test2 {
    test(i: i32): string {
        const adds: string = address();
        const randomS: string = random();
        // return randomS;
        const updatedState = updateState("TEST", "TEST2");
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

test(uuidv4(), null);

let responses: Array<number> = [];
let length = 0;

let deployedHash = null;

async function test(i, asc) {
    const node = new NodeService();
    await node.start(i, asc, true);

    // if(!deployedHash) {
    //     deployedHash = await node.deployContract(contractCode);
    // }

    deployedHash = '3951bbee5bff72191a9e656afc79bb067eb96ab04aea7ba58e6984e63673bf8b';
    console.log(deployedHash);

    const callContract = await node.callContract(i.toString(), deployedHash, {
        method: 'main',
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