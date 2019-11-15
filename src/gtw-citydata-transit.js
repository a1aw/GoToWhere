//City Data: Transit
import * as Misc from './gtw-misc';
import Dexie from 'dexie';
import Papa from 'papaparse';
import oboe from 'oboe';
import { db } from './gtw-citydata-transit-gtfs';

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
        !provider.checkDatabaseUpdate || typeof provider.checkDatabaseUpdate !== "function") {
        throw new Error("Error: " + name + " does not contain fetchDatabase or checkDatabaseUpdate function!");
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
// Database Update
//

export function obtainDatabaseVersion(pc) {
    console.log("Obtaining db version");
    var proms = [];
    for (var provider of providers) {
        //proms.push(new Promise((resolve, reject) => { resolve(false); }))
        window.x = db;
        proms.push(db["versions"].where("[package+provider]").equals([provider.pkg, provider.id]).first().then(function (row) {
            if (row) {
                var key = row["package"] + "," + row["provider"];
                dbVersions[key] = row.version;
            }
        }));
        /*
        proms.push(dbGtfs.getVersion(provider.pkg, provider.id).then(function (ver) {
            if (ver) {
                var key = ver["package"] + "," + ver["provider"];
                dbVersions[key] = ver.version;
            }
        }));
        */
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
                provider.checkDatabaseUpdate(resolve, reject, dbVersions[key]);
            });
            proms.push(p.then(function (update) {
                dbUpdateNeeded[key] = update;
            }).catch(function (err) {
                console.error("Error: Promise rejected when checking update for " + key + ".");
            }));
        } else {
            dbUpdateNeeded[key] = true;
        }
    }
    return Misc.allProgress(proms, pc);
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
                        obj.pkg = provider.pkg;
                        obj.id = provider.id;
                        console.log(obj);
                        dbChunks[key].push(obj);
                    }));
                }
            }

            proms.push(zip.file("version.json").async("string").then(function (str) {
                var json = JSON.parse(str);
                json["package"] = provider.pkg;
                json["provider"] = provider.id;
                db.versions.put(json);
            }));
        }
    }
    return Misc.allProgress(proms, pc);
}

/*
export function readChunks(pc) {
    return new Promise((resolve, reject) => {
        var worker = new Worker("./workers/loaddb.worker.js", { type: 'module' });

        worker.postMessage({
            chunks: dbChunks,
            zips: dbZips
        });

        worker.addEventListener("message", function (evt) {
            console.log(evt);
            var msg = evt.data;
            if (msg.type === 0) {
                resolve()
            } else if (msg.type === 1) {
                pc(msg.progress);
            }
        });
    });
}
*/
var worker = new Worker("./workers/loadgtfs.worker.js", { type: 'module' });

export function readChunks(dataType, pc) {
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
            for (const info of infos) {
                if (dataType !== info.dataType) {
                    continue;
                }

                proms.push(new Promise((resolve, reject) => {
                    var chunk = "";
                    var ps = [];
                    console.log("Loading " + info.dataType);
                    zip.file(info.dataType + "-chunk.json").internalStream("string")
                        .on("data", function (data) {
                            chunk += data;
                        })
                        .on("error", function (err) {
                            console.log("ERROR");
                            reject(err);
                        })
                        .on("end", function () {
                            console.log("Chunk end");
                            worker.postMessage({
                                type: 0,
                                pkg: provider.pkg,
                                id: provider.id,
                                info: info,
                                string: chunk
                            });
                            resolve();
                        })
                        .resume();
                }));
            }
        }
    }
    return Misc.allProgress(proms, pc);
}

export function waitToParse(pc) {
    return new Promise((resolve, reject) => {
        worker.addEventListener("message", function ext(evt) {
            var msg = evt.data;
            if (msg.type === 0) {
                console.log("Finish");
                worker.removeEventListener("message", ext);
                resolve();
            } else if (msg.type === 1) {
                pc(msg.progress);
            } else if (msg.type === 2) {
                var data = evt.data;
                //totalProms.push(dbGtfs.put(data.pkg, data.id, data.info.dataType, data.result));
                totalProms.push(db.putGtfs(data.pkg, data.id, data.info.dataType, data.result));
            }
        });
        worker.postMessage({
            type: 1
        });
    });
}

export function waitToStore(pc) {
    return Misc.allProgress(totalProms, pc).then(function () {
        console.log("Done storing");
        totalProms = [];
    });
}