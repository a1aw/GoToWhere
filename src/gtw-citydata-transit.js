//City Data: Transit
import * as Misc from './gtw-misc';
import * as dbGtfs from './gtw-citydata-transit-gtfs';
import Papa from 'papaparse';
import oboe from 'oboe';

var providers = [];
var totalProms = [];
var dbVersions = {};
var dbZips = {};
var dbChunks = {};
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

window.processMs = 0;
window.processCount = 0;
function csvStreamPut(putFunc, provider, zip, fileName, pc) {
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

var FILES = [
    "agency.json",
    "calendar_dates.json",
    "calendar.json",
    "fare_attributes.json",
    "fare_rules.json",
    "frequencies.json",
    "routes.json",
    "stops.json",
    "stop_times.json",
    "trips.json"
];
    
export function prepareUpdate(pc) {
    console.log("DBZips:");
    console.log(dbZips);
    var proms = [];
    var p;
    var zip;
    for (var provider of providers) {
        var key = provider.pkg + "," + provider.id;
        if (dbZips[key]) {
            zip = dbZips[key];
            console.log("Preparing for update for key: " + key);
            if (!zip.files["version.json"]) {
                console.error("Error: Database returned from " + key + " does not contain a version file.");
                continue;
            }

            dbChunks[key] = [];
            for (var file of FILES) {
                if (zip.files[file]) {
                    proms.push(zip.files[file].async("string").then(function (str) {
                        var obj = JSON.parse(str);
                        console.log(obj);
                        dbChunks[key].push(obj);
                    }));
                }
            }
        }
    }
    return Misc.allProgress(proms, pc);
}

const chunkWorker = new Worker("img/chunkworker.js");
window.x = chunkWorker;
console.log(x);

export function readChunks(pc) {
    console.log("DBChunks:");
    console.log(dbChunks);
    var proms = [];
    var p;
    var i;
    var infos;
    var zip;
    for (var provider of providers) {
        var key = provider.pkg + "," + provider.id;
        zip = dbZips[key];
        if (dbChunks[key]) {
            infos = dbChunks[key];
            chunkWorker.postMessage(infos);
            /*
            for (var info of infos) {
                for (i = 0; i < info.chunks; i++) {
                    proms.push(new Promise((resolve, reject) => {
                        var chunk = "";
                        var ps = [];
                        console.log(i + " " + info.dataType);
                        console.log(zip);
                        zip.file(info.dataType + "-" + i + ".txt").internalStream("string")
                            .on("data", function (data) {
                                chunk += data;

                                var lineEnd = chunk.lastIndexOf("\r\n");
                                if (lineEnd !== -1) {
                                    var str = chunk.substr(0, lineEnd);
                                    ps.push(new Promise((resolve, reject) => {
                                        Papa.parse(str, {
                                            skipEmptyLines: true,
                                            worker: true,
                                            chunk: function (rows) {
                                                var obj;
                                                var objs = [];
                                                var j;
                                                var k;
                                                for (j = 0; j < rows.length; j++) {
                                                    obj = {};
                                                    for (k = 0; k < info.headers.length; k++) {
                                                        obj[info.headers[k]] = rows[j][k];
                                                    }
                                                    objs.push(obj);
                                                }
                                                totalProms.push(dbGtfs.put(provider.pkg, provider.id, info.dataType, objs));
                                            }, complete: function () {
                                                console.log("parse chunk complete");
                                                resolve();
                                            }
                                        });
                                    }));
                                }
                            })
                            .on("error", function (err) {
                                console.log("ERROR");
                                reject(err);
                            })
                            .on("end", function () {
                                console.log("Chunk end");
                                Promise.all(ps).then(resolve);
                            })
                            .resume();
                    }));
                    /*
                    proms.push(new Promise((resolve, reject) => {
                        var i = 0;
                        //var sst = Date.now();
                        var o = Date.now();
                        var chunk = "";
                        zip.file(info.dataType + "-" + i + ".json").internalStream("string")
                            .on("data", function (data) {
                                chunk += data;
                                //console.log(info.dataType + "Data return " + (++i) + " used " + (Date.now() - sst));
                                //sst = Date.now();
                            })
                            .on("error", function (err) {

                            })
                            .on("end", function () {
                                console.log("End used " + (Date.now() - o) + " ms");
                                var s = Date.now();
                                var x = JSON.parse(chunk);
                                console.log("got dt: " + x.dataType);
                                console.log("parsing used " + (Date.now() - s));
                                resolve();
                            })
                            .resume();
                    }));
                    proms.push(zip.file(info.dataType + "-" + i + ".json").async("string").then(function (data) {
                        console.log("It is parsing slow");
                        /*
                        var chunk = JSON.parse(data);
                        var objs = [];
                        var obj;
                        var j;
                        var k;
                        for (j = 0; j < chunk.rows.length; j++) {
                            obj = {};
                            for (k = 0; k < info.headers.length; k++) {
                                obj[info.headers[k]] = chunk.rows[j][k];
                            }
                            objs.push(obj);
                        }
                        totalProms.push(dbGtfs.put(provider.pkg, provider.id, info.dataType, objs));
                    }));

                }

                totalProms.push(zip.file("version.json").async("string").then(function (jsonStr) {
                    var json = JSON.parse(jsonStr);
                    return dbGtfs.putVersion(provider.pkg, provider.id, json.version);
                }));
            }
            */
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