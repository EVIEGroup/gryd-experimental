import { s, t } from "../src";
import { HttpService } from "../src/services/http.service";

describe("Simple test", () => {
    test("Check literal value", () => {
        expect(s).toBe('lol');
    });

    test("Check literal value", () => {
        expect(t.run()).toBe('lol2');
    });
});


describe("Http Service test", () => {
    test("Check literal value", () => {
        const httpService = new HttpService('lol');
        expect(httpService.run()).toBe('lol');
    });
});