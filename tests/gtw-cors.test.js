import * as Cors from '../src/gtw-cors';
import assert from 'assert';

describe("gtw-cors#register", () => {
    it("should return true on registration success", () => {
        assert.equal(Cors.register("www.example.com", false), true);
    });
    it("should return false if arguments provided are invalid", () => {
        assert.equal(Cors.register(123, false), false);
    });
});

describe("gtw-cors#extractHost", () => {
    it("should return \"www.example.com\" extracting from \"https://www.example.com/testingabc\"", () => {
        assert.equal(Cors.extractHost("https://www.example.com/testingabc"), "www.example.com");
    });
    it("should return false if URL is not a string", () => {
        assert.equal(Cors.extractHost(123), false);
    });
    it("should return false if URL does not start with \"http\"", () => {
        assert.equal(Cors.extractHost("random://www.example.com/testingabc"), false);
    });
    it("should return false if URL does not contain \"://\"", () => {
        assert.equal(Cors.extractHost("www.example.com/testingabc"), false);
    });
});

describe("gtw-cors#isCors", () => {
    it("should return true if URL is not https", () => {
        assert.equal(Cors.isCors("http://www.example.com/testingabc"), true);
    });
    it("should return true if host cannot be extracted", () => {
        assert.equal(Cors.isCors("random:www.example.com/testingabc"), true);
    });
    it("should return true if not registered and not equal to current host", () => {
        assert.equal(Cors.isCors("https://www.example.com/testingabc"), true);
    });
    it("should return the registered value if it has been registered", () => {
        Cors.register("www.example.com", false);
        assert.equal(Cors.isCors("https://www.example.com/testingabc"), true);
    });
});