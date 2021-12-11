import * as sodium from 'sodium-universal';
import crypto from 'crypto';
import { CID } from 'multiformats/cid';
import { sha256 } from 'multiformats/hashes/sha2'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string';

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

    static async cidForData(data:any) {
        const bytes = uint8ArrayFromString(data);
        // We want to use the 256-bit public key as a 256-bit Kademlia key.
        // libp2p won't let us do that. We have to convert it to a "multihash" and then to a "CID".
        // This appears to mutate the key along the way, but I'm not sure how.
        // This is the best I can find for how to make a "CID" https://github.com/multiformats/js-cid#usage
        //const signKeyMultihash = await multihashing(data, 'sha2-256') // Does this *create* a SHA256 or simply *tag* as SHA256?
        const hash = await sha256.digest(bytes);

        // Note 0x12 for SHA-256
        return CID.createV0(hash);
      }
}