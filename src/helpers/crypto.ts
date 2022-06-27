import { ready, crypto_generichash } from 'libsodium-wrappers';

export class Crypto {
    constructor() {
        
    }

    static async hash (data) {
        await ready;
        const out = crypto_generichash(32, data, null, "hex");
        return out;
    }
}