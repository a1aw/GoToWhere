//City Data: Transit
import * as Misc from './gtw-misc';
import * as dbGtfs from './gtw-citydata-transit-gtfs';
import Papa from 'papaparse';

var providers = [];
var dbVersions = {};
var dbZips = {};
var dbUpdateNeeded = {};

//
// Provider registration
//

export function registerProvider(pkg, id, provider) {
    if (!provider.fetchDatabase || typeof provider.fetchDatabase !== "function" ||
        !provider.isDatabaseUpdateNeeded || typeof provider.isDatabaseUpdateNeeded !== "function") {
        throw new Error("Error: " + name + " does not contain fetchDatabase or isDatabaseUpdateNeeded function!");
    }

    provider.pkg = pkg;
    provider.id = id;
    provider.db = false;

    //provider.getRoute

    //provider.getRouteById

    //provider.getRoutes

    providers.push(provider);
}

export function unregisterProvider(id) {
    var found = -1;
    for (var i = 0; i < providers.length; i++) {
        if (providers[i].id === id) {
            found = i;
        }
    }
    providers.splice(found, 1);
}

export function getProviders() {
    return providers;
}

export function getProvider(id) {
    for (var provider of providers) {
        if (provider.id === id) {
            return provider;
        }
    }
    return false;
}

//
// Three-stage database update handling
//
// Obtain version -> Check update -> Update database

export function obtainDatabaseVersion(pc) {
    console.log("Obtaining db version");
    var proms = [];
    for (var provider of providers) {
        proms.push(dbGtfs.getVersion(provider.pkg, provider.id).then(function (ver) {
            if (ver) {
                var key = ver["package"] + "," + ver["provider"];
                dbVersions[key] = ver.version;
            }
        }));
    }
    return Misc.allProgress(proms, pc);
}

export function checkDatabaseUpdate(pc) {
    console.log("DBVersions:");
    console.log(dbVersions);
    var proms = [];
    var p;
    for (var provider of providers) {
        var key = provider.pkg + "," + provider.id;
        if (dbVersions[key]) {
            p = new Promise((resolve, reject) => {
                provider.isDatabaseUpdateNeeded(resolve, reject, dbVersions[key]);
            });
            proms.push(p.then(function (update) {
                dbUpdateNeeded[key] = update;
            }).reject(function () {
                console.error("Error: Promise rejected when checking update for " + key + ".");
            }));
        } else {
            dbUpdateNeeded[key] = true;
        }
    }
    return Misc.allProgress(proms, pc);
}

var totalProms = [];

window.processMs = 0;
window.processCount = 0;
function streamPut(putFunc, provider, zip, fileName, pc) {
    return new Promise((resolve, reject) => {
        var chunk = "";
        var items = [];
        var proms = [];
        var rowCount = 0;
        var headers = false;
        var h = zip.file(fileName).internalStream("string")
            .on("data", function (data) {
                chunk += data;

                var lastLineEnd = chunk.lastIndexOf("\r\n");

                if (lastLineEnd !== -1) {
                    var data = chunk.substr(0, lastLineEnd);
                    var p = new Promise((resolve, reject) => {
                        Papa.parse(data, {
                            skipEmptyLines: true,
                            chunk: function (results, parser) {
                                var pst = Date.now();
                                if (!headers) {
                                    console.log("Headers row");
                                    headers = results.data.shift();
                                    console.log(headers);
                                }
                                var i;
                                var row;
                                var objs = [];
                                for (i = 0; i < results.data.length; i++) {
                                    row = results.data[i];
                                    if (row.length <= 1) {
                                        console.log("Empty Row");
                                        return;
                                    }
                                    if (row.length !== headers.length) {
                                        console.error("Headers length mismatch");
                                        debugger;
                                        return;
                                    }
                                    var j;
                                    var obj = {};
                                    for (j = 0; j < headers.length; j++) {
                                        obj[headers[j]] = row[j];
                                    }
                                    objs.push(obj);
                                }
                                totalProms.push(putFunc(provider.pkg, provider.id, objs));
                                processMs += Date.now() - pst;
                                processCount++;
                            },
                            complete: function (results, file) {
                                console.log("Parse complete");
                                resolve();
                            }
                        });
                        if (lastLineEnd !== chunk.length - 2) {
                            chunk = chunk.substr(lastLineEnd + 2);
                        } else {
                            chunk = "";
                        }
                    });
                    proms.push(p);
                }

            })
            .on("error", function (err) {
                reject(err);
            })
            .on("end", function () {
                console.log("Chunk end");
                if (typeof pc === "function") {
                    Misc.allProgress(proms, pc).then(resolve);
                } else {
                    Promise.all(proms).then(resolve);
                }
            });
        h.resume();
    });
}

export function downloadDatabase(pc) {
    console.log("DBUpdateNeeded:");
    console.log(dbUpdateNeeded);
    var proms = [];
    var fdbp;
    var p;
    for (var provider of providers) {
        var key = provider.pkg + "," + provider.id;
        if (dbUpdateNeeded[key]) {
            p = new Promise((resolve, reject) => {
                provider.fetchDatabase(resolve, reject);
            });
            proms.push(p.then(function (zip) {
                dbZips[key] = zip;
            }));
        }
    }
    return Misc.allProgress(proms, pc);
}

export function updateRoutes(pc) {
    console.log("DBZips:");
    console.log(dbZips);
    var proms = [];
    var p;
    var zip;
    for (var provider of providers) {
        var key = provider.pkg + "," + provider.id;
        if (dbZips[key]) {
            zip = dbZips[key];
            console.log("Updating for key: " + key);
            if (!zip.files["version.json"]) {
                console.error("Error: Database returned from " + key + " does not contain a version file.");
                return;
            }

            if (zip.files["agency.txt"]) {
                proms.push(streamPut(dbGtfs.putAgencies, provider, zip, "agency.txt"));
            }
            if (zip.files["calendar_dates.txt"]) {
                proms.push(streamPut(dbGtfs.putCalendarDates, provider, zip, "calendar_dates.txt"));
            }
            if (zip.files["calendar.txt"]) {
                proms.push(streamPut(dbGtfs.putCalendars, provider, zip, "calendar.txt"));
            }
            /*
            if (zip.files["fare_attributes.txt"]) {
                proms.push(streamPut(dbGtfs.putFareAttributes, provider, zip, "fare_attributes.txt", console.log));
            }
            if (zip.files["fare_rules.txt"]) {
                proms.push(streamPut(dbGtfs.putFareRules, provider, zip, "fare_rules.txt"));
            }
            */
            if (zip.files["frequencies.txt"]) {
                proms.push(streamPut(dbGtfs.putFrequencies, provider, zip, "frequencies.txt"));
            }
            if (zip.files["routes.txt"]) {
                proms.push(streamPut(dbGtfs.putRoutes, provider, zip, "routes.txt"));
            }
            if (zip.files["stops.txt"]) {
                proms.push(streamPut(dbGtfs.putStops, provider, zip, "stops.txt"));
            }
            /*
            if (zip.files["stop_times.txt"]) {
                waitProms.push(streamPut(dbGtfs.putStopTimes, provider, zip, "stop_times.txt"));
            }
            */
            if (zip.files["trips.txt"]) {
                proms.push(streamPut(dbGtfs.putTrips, provider, zip, "trips.txt"));
            }

            proms.push(zip.file("version.json").async("string").then(function (jsonStr) {
                var json = JSON.parse(jsonStr);
                return dbGtfs.putVersion(provider.pkg, provider.id, json.version);
            }));
        }
    }
    return Misc.allProgress(proms, pc);
}

export function waitToStore(pc) {
    return Misc.allProgress(totalProms, pc).then(function () {
        console.log("Done storing");
        totalProms = [];
    });
}

export function updateStops(pc) {
    console.log("DBZips:");
    console.log(dbZips);
    var proms = [];
    var p;
    var zip;
    for (var provider of providers) {
        var key = provider.pkg + "," + provider.id;
        if (dbZips[key]) {
            zip = dbZips[key];
            console.log("Updating for key: " + key);
            if (!zip.files["version.json"]) {
                console.error("Error: Database returned from " + key + " does not contain a version file.");
                return;
            }
            /*
            if (zip.files["fare_attributes.txt"]) {
                proms.push(streamPut(dbGtfs.putFareAttributes, provider, zip, "fare_attributes.txt", console.log));
            }
            if (zip.files["fare_rules.txt"]) {
                proms.push(streamPut(dbGtfs.putFareRules, provider, zip, "fare_rules.txt"));
            }
            if (zip.files["stop_times.txt"]) {
                proms.push(streamPut(dbGtfs.putStopTimes, provider, zip, "stop_times.txt"));
            }
            */
        }
    }
    return Misc.allProgress(proms, pc);
}