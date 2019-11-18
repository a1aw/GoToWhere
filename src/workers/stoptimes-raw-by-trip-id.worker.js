//import { db } from '../gtw-citydata-transit-gtfs';
import Dexie from 'dexie';

var db = new Dexie("gtfs");

db.version(1).stores({
    "versions": "[package+provider]",
    "agency": "[package+provider+agency_id],[package+provider]",
    "calendar": "[package+provider+service_id],[package+provider]",
    "calendar_dates": "[package+provider+service_id+date],[package+provider],[package+provider+service_id]",
    "frequencies": "[package+provider+trip_id],[package+provider]",
    "routes": "[package+provider+route_id],[package+provider],route_short_name",
    "trips": "[package+provider+trip_id],[package+provider],[package+provider+route_id],[package+provider+route_id+service_id]",
    "stops": "[package+provider+stop_id],[package+provider]",
    "stop_times": "++id, [package+provider+trip_id], [package+provider+stop_id], [package+provider]",
    "stop_time_paths": "++id, [package+provider+path_id], [package+provider+stop_id], [package+provider]",
    "fare_attributes": "[package+provider+fare_id],[package+provider]",
    "fare_rules": "[package+provider+fare_id],[package+provider]",
    "stop_times_raw": "[package+provider]",
    "fare_attributes_raw": "[package+provider]",
    "fare_rules_raw": "[package+provider]"
});

self.addEventListener("message", function (evt) {
    var pkg = evt.data.pkg;
    var provider = evt.data.id;
    var tripId = evt.data.tripId;

    db["stop_times_raw"].where("[package+provider]").equals([pkg, provider]).first().then(function (row) {
        var headerIndex = row.headers.indexOf("trip_id");
        var chunk = row.rows;
        chunk.sort(function (a, b) {
            return a[headerIndex].localeCompare(b[headerIndex]);
        });
        var mid;
        var val;
        var com;
        var start = 0;
        var end = chunk.length - 1;
        while (start < end) {
            mid = Math.floor((start + end) / 2);
            val = chunk[mid];
            com = tripId.localeCompare(val[headerIndex]);

            if (com === 0) {
                end = mid;
            } else if (com > 0) {
                start = mid + 1;
            } else {
                end = mid - 1;
            }
        }

        var i;
        var outRows = [];

        if (chunk[start][headerIndex] === tripId) {
            for (i = start; i < chunk.length; i++) {
                if (chunk[i][headerIndex] !== tripId) {
                    break;
                }
                outRows.push(chunk[i]);
            }
        }

        var out = [];
        var obj;
        var j;
        var val;
        var headerType;
        for (i = 0; i < outRows.length; i++) {
            var obj = {};
            for (j = 0; j < row.headers.length; j++) {
                val = outRows[i][j];
                if (val !== "") {
                    headerType = row.headerTypes[j];
                    if (headerType === "int") {
                        val = parseInt(val);
                    } else if (headerType === "float") {
                        val = parseFloat(val);
                    }
                    obj[row.headers[j]] = val;
                }
            }
            out.push(obj);
        }

        out.sort(function (a, b) {
            return a["stop_sequence"] - b["stop_sequence"];
        });

        self.postMessage(out);
        self.close();
    });
});