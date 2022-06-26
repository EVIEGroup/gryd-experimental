export abstract class ContractService {
    globalState = new Map<string, Map<string, any>>();
    
    constructor() {
        
    }
    
    async currentState(contractHash): Promise<Map<string, any>> {
        if(!this.globalState.has(contractHash)) {
            const contractState = new Map();
            this.globalState.set(contractHash, contractState);
            return contractState;
        } else {
            return this.globalState.get(contractHash);
        }
    }

    async updateState(contractHash: string, key: string, value: any): Promise<any> {
        const currentState = await this.currentState(contractHash);
        currentState.set(key, value);
        return value;
    }

    async getState(contractHash: string, key: string) {
        const currentState = await this.currentState(contractHash);
        return currentState.get(key);
    }
}