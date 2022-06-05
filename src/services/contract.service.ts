
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string';
import { toString as uint8ArrayToString } from 'uint8arrays/to-string';

import Libp2p from 'libp2p';

export abstract class ContractService {
    constructor(protected node: Libp2p) {
        
    }
    
    async updateState(contractHash: string, key: string, value: any): Promise<any> {
        // return 1;
        const stateUpdate = {
            //nonce: uuidv4(),
            key: key,
            value: value,
        }

        const encodedValue = uint8ArrayFromString(JSON.stringify(stateUpdate));
        const contractKey = uint8ArrayFromString(contractHash + key);
        const run = async () => {
            try {
                await this.node.contentRouting.put(contractKey, encodedValue);
                await this.node.pubsub.publish(contractHash, encodedValue);
            } catch(e) {
                await run();
            }
        };

        // Do we await here yet?
        run();

        return value;
    }

    async getState(contractHash: string, key: string) {
        try {
            const value = await this.node.contentRouting.get(uint8ArrayFromString(contractHash + key));
            const decoded = JSON.parse(uint8ArrayToString(value.val));
            const trueValue = decoded.value;
            return trueValue;
        } catch(e) {
            return null;
        }
    }
}