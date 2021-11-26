
import { ClientService } from './client.service';
import { ContractService } from './contract.service';
import { NodeService } from './node.service';
import { v4 as uuidv4 } from 'uuid';

export class WorkerService {
    contractService: ContractService;
    nodeService: NodeService;
    clientService: ClientService;
    identifier: string;
    port: number = 8080;

    constructor() {
        const args = this.getArgs();
        this.port = Number.parseInt(args.port);
        const masterport = args.masterport ? Number.parseInt(args.masterport) : 8081;

        this.identifier = uuidv4();
        console.log('Identifier', this.identifier);
        this.contractService = new ContractService(this);
        this.nodeService = new NodeService(this, this.port, masterport);
        this.clientService = new ClientService(this, this.port+1);
    }

    getArgs() {
        const args = process.argv.slice(2);
        const newArgs: any = {};

        for (let i = 0,j = args.length; i < j; i += 2) {
            const argSet = args.slice(i, i + 2);

            // do whatever
            newArgs[argSet[0].substring(2)] = argSet[1];
        }

        return newArgs;
    }
}