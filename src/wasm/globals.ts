export const globalFunctions = `
@external("console", "log")
declare function log(description: string, value: string): void;

@external("process", "address")
declare function address(): string;

@external("process", "random")
declare function random(): string;

@external("process", "value")
declare function numberValue(): i32;

@external("process", "contractAddress")
declare function contractAddress(): string;

@external("process", "updateState")
declare function updateState(key: string, value: string): string;

@external("process", "getState")
declare function getState(key: string): string;`