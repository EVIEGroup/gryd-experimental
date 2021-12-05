import * as sodium from 'sodium-universal';
import crypto from 'crypto';

export class Crypto {
    static createKeyPair (seed) {
        const publicKey = Buffer.alloc(32);
        const secretKey = Buffer.alloc(64);

        if (seed) sodium.crypto_sign_seed_keypair(publicKey, secretKey, seed);
        else sodium.crypto_sign_keypair(publicKey, secretKey);
        return { publicKey: publicKey, secretKey: secretKey };
    }

    static hash (data) {
        return crypto.createHash('sha256').update(data).digest();
        const out = Buffer.alloc(32);
        sodium.crypto_generichash(out, Buffer.from(data, 'utf8'));
        return out;
    }

    static sign(message, secretKey) {
        const out = Buffer.alloc(64);
        sodium.crypto_sign_detached(out, Buffer.from(message, 'utf8'), secretKey);
        return out;
    }

    static verifySignature (signature, message, publicKey) {
        return sodium.crypto_sign_verify_detached(signature, Buffer.from(message, 'utf8'), publicKey);
    }

}