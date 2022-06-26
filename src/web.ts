import { NodeService } from "./services/node.service";

// Shim hrtime
if(!process.hrtime) {
    process.hrtime = require('browser-process-hrtime');
}


const contractCode = `
class Test2 {

}

class Test extends Test2 {
    test(i: i32): string {
        //const adds: string = address();
        //const randomS: string = random();
        // return randomS;
        let theState = getState("TEST");

        if(theState == null) {
            theState = (i + 1).toString();
        } else {
            theState = (Number.parseInt(theState) + 1).toString();
        }

        const updatedState = updateState("TEST", theState);

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
    await node.start(i);

    const deployedHash = await node.deployContract(contractCode);

    console.log('HASH', deployedHash);


    for(let i2 = 0; i2 < 10; i2++) {
        const callContract2 = await node.callContract(i.toString(), deployedHash, {
            method: 'main',
            params: [ i ]
        });
        
        console.log('Contract Call', callContract2);
    }


    return;
}

// @ts-ignore()
window.test = test;
//document.body.innerHtml