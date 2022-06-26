import { NodeService } from "./services/node.service";
import { v4 as uuidv4 } from 'uuid';
import asc from "assemblyscript/cli/asc";

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

let responses: Array<number> = [];
let length = 0;

test(uuidv4());

let deployedHash = null;

async function test(i) {
    const node = new NodeService();
    await node.start(i);

    if(!deployedHash) {
        deployedHash = await node.deployContract(contractCode);
    }

    for(let j = 0; j < 1; j++) {
        setInterval(async () => {
            const start = process.hrtime();
            const callContract = await node.callContract(i.toString(), deployedHash, {
                method: 'main',
                params: [ i ]
            });
            var elapsed = process.hrtime(start)[1] / 1000000;
            responses.push(elapsed);
            // console.log(JSON.parse(callContract));
            // console.log(elapsed);
        }, 0);
    }
}

setInterval(() => {
    const copiedResponses = [...responses];
    length += copiedResponses.length;
    if(copiedResponses.length > 0) {
        console.log(copiedResponses.reduce((a, b) => (a + b)) / copiedResponses.length, length);
        responses = [];
    }
}, 1000)