import * as Misc from '../gtw-misc';
import { db } from '../gtw-citydata-transit-gtfs';

var reqs = [];
var running = false;
var proms = [];

self.addEventListener("message", function (evt) {
    var msg = evt.data;
    if (msg.type === 0) {
        reqs.push(msg);
    } else if (msg.type === 1) {
        task();
    }
});

var proms = [];

var task = function (limit) {
    running = true;
    while (reqs.length > 0) {
        var data = reqs.shift();
        if (!data) {
            console.log("Empty data");
            continue;
        }
        
        //console.log("DATA CSV: " + data.csv.length);
            /*
        proms.push(new Promise((resolve, reject) => {
            var objs = [];
            Papa.parse(data.csv, {
                skipEmptyLines: true,
                worker: true,
                chunk: function (parsed) {
                    var rows = parsed.data;
                    var obj;
                    var j;
                    var k;
                    var headers = data.info.headers;
                    var headerTypes = data.info.headerTypes;
                    for (j = 0; j < rows.length; j++) {
                        obj = {};
                        for (k = 0; k < headers.length; k++) {
                            if (headerTypes[k] === "int") {
                                obj[headers[k]] = parseInt(rows[j][k]);
                            } else if (headerTypes[k] === "float") {
                                obj[headers[k]] = parseFloat(rows[j][k]);
                            } else {
                                obj[headers[k]] = rows[j][k];
                            }
                        }
                        obj["package"] = data.pkg;
                        obj["provider"] = data.id;
                        objs.push(obj);
                    }
                }, complete: function (parsed) {
                    resolve();
                }
            });
        }));
            */
        var parsed = JSON.parse(data.string);
        console.log(parsed);

        var rows = parsed.rows;

        if (data.info.dataType !== "stop_times" &&
            data.info.dataType !== "fare_attributes" &&
            data.info.dataType !== "fare_rules") {
            var objs = [];
            var obj;
            var j;
            var k;
            var headers = data.info.headers;
            var headerTypes = data.info.headerTypes;
            for (j = 0; j < rows.length; j++) {
                obj = {};
                for (k = 0; k < headers.length; k++) {
                    if (headerTypes[k] === "int") {
                        obj[headers[k]] = parseInt(rows[j][k]);
                    } else if (headerTypes[k] === "float") {
                        obj[headers[k]] = parseFloat(rows[j][k]);
                    } else {
                        obj[headers[k]] = rows[j][k];
                    }
                }
                obj["package"] = data.pkg;
                obj["provider"] = data.id;
                obj["version"] = data.info.version;
                objs.push(obj);
            }

            console.log(objs);

            proms.push(db[data.info.dataType].bulkPut(objs));
        } else {
            proms.push(db[data.info.dataType + "_raw"].put({
                "package": data.pkg,
                provider: data.id,
                headers: data.info.headers,
                headerTypes: data.info.headerTypes,
                rows: rows
            }));
        }
        /*
        self.postMessage({
            type: 2,
            pkg: data.pkg,
            id: data.id,
            info: data.info
        });
        */
    }
    Promise.all(proms).then(function () {
        self.postMessage({
            type: 0
        });
    });
    //objs = [];
    reqs = [];
    running = false;
};