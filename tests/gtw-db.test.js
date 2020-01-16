import * as Database from '../src/gtw-db';
import assert from 'assert';

describe("gtw-db#putPluginStorage", () => {
    it("should put specified data into IndexedDB correctly", () => {
        return Database.putPluginStorage("testingpackage", {
            "testingData": "dataTesting"
        }).then(() => {
            return Database.db["pluginStorage"].where("package").equals("testingpackage").first();
        }).then((row) => {
            assert.equal(row, {"package": "testingpackage", "testingData": "dataTesting"});
        });
    });
});

/*
describe("gtw-db#deleteDatabase", () => {
    it("should delete database with no errors", () => {
        return Database.deleteDatabase();
    });
});
*/