import { NodeService } from "./services/node.service";
import { v4 as uuidv4 } from 'uuid';
//const blockchain = new BlockchainService();
//console.log(blockchain.getLastBlock());
const contractCode = `
class Test2 {

}

class JSONSchema {
    firstName: string
    lastName: string
    age: i32
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
        const data: JSONSchema = {
            firstName: 'Jairus',
            lastName: 'Tanaka',
            age: 14
        };
        // const stringified = JSON.stringify(data.firstName);
        // return stringified;

        // Create encoder
        
        const primObj: JSON.Obj = JSON.Value.Object();
        primObj.set("Str", JSON.from("Hello"));
        let childObj = JSON.Value.Object();
        childObj.set("Test", JSON.from("LOL"));
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

for(let i = 0; i < 2; i++) {
    test(uuidv4());
}


let deployedHash = null;

async function test(i) {
    const node = new NodeService();
    await node.start(i, true);

    if(!deployedHash) {
        deployedHash = await node.deployContract(contractCode);
    }

    console.log(deployedHash);

    for(let j = 0; j < 1; j++) {
        setInterval(async () => {
            const start = process.hrtime();
            const callContract = await node.callContract(i.toString(), deployedHash, {
                method: 'test',
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