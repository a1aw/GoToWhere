import * as Misc from '../src/gtw-misc';
import assert from 'assert';

describe("gtw-misc#fillZero", () => {
    it("should fill one zero to the front if less than 10", () => {
        assert.equal(Misc.fillZero(9), "09");
    });
    it("should return -1 if number is equal or larger than 60", () => {
        assert.equal(Misc.fillZero(60), -1);
    });
    it("should return -1 if number is less than 0", () => {
        assert.equal(Misc.fillZero(-1), -1);
    });
});