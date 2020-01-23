import * as Database from '../src/gtw-db';
import assert from 'assert';

describe("gtw-db#putPluginStorage", () => {
    it("should put specified data into IndexedDB correctly", () => {
        return Database.putPluginStorage("testingpackage", {
            "testingData": "dataTesting"
        }).then(() => {
            return Database.db["pluginStorage"].where("package").equals("testingpackage").first();
        }).then((row) => {
            if (!row ||
                row.package !== "testingpackage" ||
                !row.data ||
                row.data.testingData !== "dataTesting") {
                assert.fail("Invalid data inputted into database");
            }
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