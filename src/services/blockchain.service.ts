import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export class BlockchainService {
    chain: any = [];
    buffer: any = {};
    votingBuffer: any = {};
    onHold: any;
    voting: any;

    constructor() {
        const genesisBlock = this.createBlock("DecentranetGenesisBlock", "-", {
            data: "I am the genesis block!",
            authors: "Craig Whiteside, Tamsin Slinn"
        }, this.getCurrentTimestamp());

        this.chain.push(genesisBlock);
    }

    hash(str: string) {
        return crypto.createHash('sha256').update(str).digest('hex');
    }

    getCurrentTimestamp() {
        return (new Date()).toISOString().replace("T", " ").replace("Z", "");
    }

    getBlockHash(previousBlockHash: string, carPlate: any, carData: any) {
        const dataAsString = previousBlockHash + JSON.stringify(carPlate) + JSON.stringify(carData);
        return this.hash(dataAsString);
    }

    updateInstance(blockchain: any) {
        this.chain = blockchain.chain;
        this.onHold = blockchain.onHold;
        this.voting = blockchain.voting;
    }
    
    getLastBlock() {
        return this.chain[this.chain.length - 1];
    }
    
    getLasts(range: any) {
        if (this.chain.length < range) range = this.chain.length;
        const start = this.chain.length - range;
        const end = this.chain.length;
        return this.chain.slice(start, end)
    }

    createBlock(lastBlockHash: string, carPlate: any, carData: any, timestamp: string) {
        var index = 1;
        try { 
            index = this.chain[this.chain.length - 1].index + 1;
        } catch(err) { 
            index = 1;
        }
    
        return {
            index: index,
            id: uuidv4(),
            timestamp: timestamp,
            carPlate: carPlate,
            carData: carData,
            hash: this.getBlockHash(lastBlockHash, carPlate, carData),
            previousBlockHash: lastBlockHash
        };
    }

    logBuffer() {
        console.log(`Current buffer size: ${Object.keys(this.buffer).length}`);
        console.log(`Current voting buffer size: ${Object.keys(this.votingBuffer).length}`);
    }

    putBlockOnHold(block: any) {
        if (!(block['hash'] in this.buffer)) {
            this.buffer[block['hash']] = {
                block: block,
                voting: {
                    nodesVoted: [],
                    votes: [],
                    yesVotes: 0
                }
            }

            if (block['hash'] in this.votingBuffer) {
                // process votes received before block
                this.votingBuffer[block['hash']].forEach((voteInfo: any) => {
                    this.processVote(voteInfo.blockHash, 
                                    voteInfo.blockIndex, 
                                    voteInfo.nodeAddress,
                                    voteInfo.vote);
                });
            }
        } else {
            console.log(`Block ${block['hash']} already in buffer`);
        }

        this.logBuffer();
    }

    // TODO: this might blow up if node is not a full node
    // test if there's a possibility of the array index being different than 'index-1'
    isBlockInBlockchain(hash: string, index: number) {
        return (this.chain[index-2]['hash'] === hash);
    }

    holdVoteOnBuffer(blockHash: string, voteInfo: any) {
        if (!(blockHash in this.votingBuffer)) {
            this.votingBuffer[blockHash] = [];
        }

        this.votingBuffer[blockHash].push(voteInfo);
    }

    // returns current number of yes votes for block on voting after new vote is processed
    processVote(blockHash: string, blockIndex: number, nodeAddress: string, vote: string) {
        if (this.isBlockInBlockchain(blockHash, blockIndex)) {              // this block was already accepted (can happen if a vote comes after consensus was already achieved)
            console.log(`Block ${blockHash} already accepted. Index: ${blockIndex}`);
            return -1;
        }

        // check if block being voted is in buffer and vote is not repeated
        if (blockHash in this.buffer) {
            if (this.buffer[blockHash].voting.nodesVoted.indexOf(nodeAddress) == -1) {
                this.buffer[blockHash].voting.nodesVoted.push(nodeAddress);
                this.buffer[blockHash].voting.votes.push({
                    node: nodeAddress,
                    vote: vote
                });
                if (vote === "yes") this.buffer[blockHash].voting.yesVotes++;
            }
        } else {
            // a vote might be received before the block was put on buffer
            this.holdVoteOnBuffer(blockHash, {
                blockHash: blockHash,
                blockIndex: blockIndex,
                nodeAddress: nodeAddress,
                vote: vote
            });
            return { warning: `block ${blockHash} being voted not yet received` };
        }

        return { 
            totalVotes: this.buffer[blockHash].voting.nodesVoted.length,
            yesVotes: this.buffer[blockHash].voting.yesVotes
        };
    }


    closeVotingOnBlock(hash: string) {
        delete this.buffer[hash];
        delete this.votingBuffer[hash];
        this.logBuffer();
    }

    addBlockOnBuffer(hash: string) {
        if (!(hash in this.buffer)) {
            throw `Trying to add block that is not on buffer: ${hash}`;
        }

        this.chain.push(this.buffer[hash].block);
        this.closeVotingOnBlock(hash);
    }

    isValidNewBlock(newBlock: any) {
        const lastBlock = this.getLastBlock();
        const correctIndex = newBlock['index'] === lastBlock['index'] + 1;
        const correctLastHash = newBlock['previousBlockHash'] === lastBlock['hash'];
        const recalculatedNewHash = this.getBlockHash(newBlock['previousBlockHash'], newBlock['carPlate'], newBlock['carData']);
        const correctNewHash = recalculatedNewHash === newBlock['hash'];

        return {
            details: {
                "correctIndex": correctIndex,
                "correctLastHash": correctLastHash,
                "correctNewHash": correctNewHash
            },
            isValid: (correctIndex && correctLastHash && correctNewHash)
        };
    }
}