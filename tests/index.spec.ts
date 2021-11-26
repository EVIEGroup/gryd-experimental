import { HttpService } from "../src/services/http.service";

describe("Http Service test", () => {
    test("Check literal value", () => {
        const httpService = new HttpService('lol');
        expect(httpService.run()).toBe('lol');
    });
});