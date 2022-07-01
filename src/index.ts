import { NodeService } from "./services/node.service";
import { v4 as uuidv4 } from 'uuid';
import signalhubServer from 'signalhub/server';

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

        const strings = JSON.parse('{"id":"0001","type":"donut","name":"Cake","ppu":0.55,"batters":{"batter":[{"id":"1001","type":"Regular"},{"id":"1002","type":"Chocolate"},{"id":"1003","type":"Blueberry"},{"id":"1004","type":"Devil\\'s Food"}]},"topping":[{"id":"5001","type":"None"},{"id":"5002","type":"Glazed"},{"id":"5005","type":"Sugar"},{"id":"5007","type":"Powdered Sugar"},{"id":"5006","type":"Chocolate with Sprinkles"},{"id":"5003","type":"Chocolate"},{"id":"5004","type":"Maple"}]}');

        return strings.stringify();
        //return strings.stringify();
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
    const node = new NodeService({
        server: true,
    });
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
            // console.log(JSON.parse(callContract));
            var elapsed = process.hrtime(start)[1] / 1000000;
            responses.push(elapsed);
            // console.log(JSON.parse(callContract));
            // console.log(elapsed);
        }, 1000);
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