import * as Misc from '../src/gtw-misc';
import assert from 'assert';

describe("gtw-misc#geoDistance", () => {
    it("should around 1 km from Yau Ma Tei Station to Jordan Station", () => {
        assert.equal(Math.round(Misc.geoDistance(22.3133751, 114.1704726, 22.3049093, 114.1715562)), 1);
    });
    it("should return -1 if one of the arguments are empty", () => {
        assert.equal(Misc.geoDistance(), -1);
    });
});

describe("gtw-misc#stringCompare", () => {
    it("should return 1 comparing \"efgh\" with \"abcd\"", () => {
        assert.equal(Misc.stringCompare("efgh", "abcd"), 1);
    });
    it("should return -1 comparing \"abc\" with \"hijk\"", () => {
        assert.equal(Misc.stringCompare("abc", "hijk"), -1);
    });
    it("should return 0 comparing \"lmno\" with \"lmno\"", () => {
        assert.equal(Misc.stringCompare("lmno", "lmno"), 0);
    });
    it("should return false if arguments contain non-string", () => {
        assert.equal(Misc.stringCompare(50, "abc"), false);
    });
});

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