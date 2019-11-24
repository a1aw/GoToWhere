import Dexie from 'dexie';
import * as Misc from './gtw-misc';

export var db = new Dexie("gtfs");

var stopTimesValid = {};

db.version(1).stores({
    "versions": "[package+provider],[package+provider+version],package",
    "agency": "[package+provider+agency_id],[package+provider],[package+provider+version],package",
    "calendar": "[package+provider+service_id],[package+provider],[package+provider+version],package",
    "calendar_dates": "[package+provider+service_id+date],[package+provider],[package+provider+service_id],[package+provider+version],package",
    "frequencies": "[package+provider+trip_id],[package+provider],[package+provider+version],package",
    "routes": "[package+provider+route_id],[package+provider],route_short_name,[package+provider+version],package",
    "trips": "[package+provider+trip_id],[package+provider],[package+provider+route_id],[package+provider+route_id+service_id],[package+provider+path_id],[package+provider+version],package",
    "stops": "[package+provider+stop_id],[package+provider],[package+provider+version],package",
    "stop_times": "++id, [package+provider+trip_id], [package+provider+stop_id], [package+provider],[package+provider+version],package",
    "stop_time_paths": "++id, [package+provider+path_id], [package+provider+stop_id], [package+provider],[package+provider+version],package",
    "fare_attributes": "[package+provider+fare_id],[package+provider],[package+provider+version],package",
    "fare_rules": "[package+provider+fare_id],[package+provider],[package+provider+version],package",
    "stop_times_raw": "[package+provider],[package+provider+version],package",
    "fare_attributes_raw": "[package+provider],[package+provider+version],package",
    "fare_rules_raw": "[package+provider],[package+provider+version],package"
});

var STORES = [
    "versions",
    "agency",
    "calendar",
    "calendar_dates",
    "frequencies",
    "routes",
    "trips",
    "stops",
    "stop_times",
    "stop_time_paths",
    "fare_attributes",
    "fare_rules",
    "stop_times_raw",
    "fare_attributes_raw",
    "fare_rules_raw"
];

//
// Misc
//

export async function navigate(startPos, endPos, walkRange) {
    var nearbyStops = await searchNearbyStops(startPos.lat, startPos.lng, walkRange, true);
    var route;
    var stop;
    var stopTimes;
    var trips;
    var routeResult;
    var pathResults;
    var results = [];
    var addedRouteIds = [];
    var dist;
    var minDist;
    var minDistStop;

    var stopLoopTime = 0;
    var stopLoopCount = 0;

    var pathLoopTime = 0;
    var pathLoopCount = 0;

    var pathStopLoopTime = 0;
    var pathStopLoopCount = 0;

    var pathResultLoopTime = 0;
    var pathResultLoopCount = 0;

    var st;

    for (var stopResult of nearbyStops) {
        st = Date.now();

        routeResult = await searchStopRoutes(stopResult.stop["package"], stopResult.stop["provider"], stopResult.stop["stop_id"]);
        console.log("SearchStopUsed: " + (Date.now() - st));
        pathResults = [];
        for (var pathId in routeResult.stopTimes) {
            var sst = Date.now();

            minDist = false;
            minDistStop = false;
            stopTimes = await getStopTimePathByPathId(stopResult.stop["package"], stopResult.stop["provider"], pathId);
            for (var stopTime of stopTimes) {
                var ssst = Date.now();

                stop = await getStop(stopTime["package"], stopTime["provider"], stopTime["stop_id"]);
                dist = Misc.geoDistance(endPos.lat, endPos.lng, stop["stop_lat"], stop["stop_lon"]);
                if (!minDist || !minDistStop || dist < minDist) {
                    minDist = dist;
                    minDistStop = stop;
                }

                pathStopLoopTime += Date.now() - ssst;
                pathStopLoopCount++;
            }

            if (minDist && minDistStop && minDist <= walkRange) {
                pathResults.push({
                    distance: minDist,
                    stop: minDistStop,
                    pathId: pathId,
                    path: stopTimes
                });
            }

            pathLoopTime += Date.now() - sst;
            pathLoopCount++;
        }

        for (var pathResult of pathResults) {
            var sst = Date.now();

            trips = await getTripsByPathId(pathResult.stop["package"], pathResult.stop["provider"], pathResult.pathId);
            for (var trip of trips) {
                if (addedRouteIds.includes(trip["route_id"])) {
                    continue;
                }
                addedRouteIds.push(trip["route_id"]);
                route = await getRoute(trip["package"], trip["provider"], trip["route_id"]);
                results.push({
                    route: route,
                    startStop: stopResult.stop,
                    endStop: pathResult.stop,
                    path: pathResult.path,
                    pathId: pathResult.pathId,
                    startDistance: stopResult.distance,
                    endDistance: pathResult.distance
                });
            }

            pathResultLoopTime += Date.now() - sst;
            pathResultLoopCount++;
        }

        stopLoopTime += Date.now() - st;
        stopLoopCount++;
    }
    console.log("StopLoop: " + (Math.round(stopLoopTime / stopLoopCount * 100) / 100) + " count " + stopLoopCount);
    console.log("PathLoop: " + (Math.round(pathLoopTime / pathLoopCount * 100) / 100) + " count " + pathLoopCount);
    console.log("PathStopLoop: " + (Math.round(pathStopLoopTime / pathStopLoopCount * 100) / 100) + " count " + pathStopLoopCount);
    console.log("PathResultLoop: " + (Math.round(pathResultLoopTime / pathResultLoopCount * 100) / 100) + " count " + pathResultLoopCount);

    results.sort((a, b) => {
        return (a.startDisance + a.endDistance) - (b.startDistance + b.endDistance);
    });

    return results;
}

export async function validateDatabase(pkg, provider, version, map) {
    var requiredRows;
    var count;
    for (var key in map) {
        if (key === "stop_times" ||
            key === "fare_attributes" ||
            key === "fare_rules"
        ) {
            continue;
        }
        requiredRows = map[key];
        count = await db[key].where("[package+provider+version]")
            .equals([pkg, provider, version]).count();
        if (count !== requiredRows) {
            console.warn("Warning: " + pkg + "," + provider + " " + version + " version database invalid at " + key + " with different rows: " + count + " (Required: " + requiredRows + ")");
            return false;
        }
    }
    return true;
}

export async function clearDatabase(pkg, provider) {
    for (var storeKey of STORES) {
        await db[storeKey].where("[package+provider]")
            .equals([pkg, provider]).delete();
    }
}

export async function clearPackageDatabase(pkg) {
    for (var storeKey of STORES) {
        await db[storeKey].where("package")
            .equals(pkg).delete();
    }
}

export function selectAgencyStopName(agencyId, stopName) {
    if (stopName.startsWith("\"") && stopName.endsWith("\"")) {
        stopName = stopName.substr(1, stopName.length - 2);
    }
    var splits = stopName.split("|");
    var key = "[" + agencyId + "] ";
    for (var i = 0; i < splits.length; i++) {
        if (splits[i].startsWith(key)) {
            return splits[i].substr(key.length);
        }
    }
    var val = splits[0];
    var spaceIndex = val.indexOf("] ");
    if (spaceIndex === -1) {
        return val;
    } else {
        return val.substr(spaceIndex + 2);
    }
}

export function selectFirstAgencyStopName(stopName){
    if (stopName.startsWith("\"") && stopName.endsWith("\"")) {
        stopName = stopName.substr(1, stopName.length - 2);
    }
    var splits = stopName.split("|");
    if (splits.length > 0) {
        var val = splits[0];
        var spaceIndex = val.indexOf("] ");
        if (spaceIndex === -1) {
            return val;
        } else {
            return val.substr(spaceIndex + 2);
        }
    } else {
        return stopName;
    }
}

export async function getCurrentTrip(pkg, provider, routeId) {
    var trips = await getTripsByRouteId(pkg, provider, routeId);
    var freq;
    for (var trip of trips) {
        freq = getCurrentFrequency(pkg, provider, trip["trip_id"]);
        if (freq) {
            return trip;
        }
    }
    return false;
}

export function timeToDate(timeStr) {
    var splits = timeStr.split(":");
    var date = new Date();
    date.setHours(splits[0]);
    date.setMinutes(splits[1]);
    date.setSeconds(splits[2]);
    return date;
}

export function isCurrentFrequency(freq) {
    var now = Date.now();

    var startDate = timeToDate(freq["start_time"]);
    var endDate = timeToDate(freq["end_time"]);

    return now >= startDate.getTime() && now <= endDate.getTime();
}

export async function getRoutePathFrequencies(pkg, provider, routeId, pathId) {
    var trips = await getTripsByRouteId(pkg, provider, routeId);
    var out = [];
    var exist;
    for (var trip of trips) {
        if (trip["path_id"] !== pathId) {
            continue;
        }
        var freqs = await getFrequencies(pkg, provider, trip["trip_id"]);
        for (var freq of freqs) {
            exist = false;
            for (var outFreq of out) {
                if (outFreq["start_time"] === freq["start_time"] &&
                    outFreq["end_time"] === freq["end_time"] &&
                    outFreq["headway_secs"] === freq["headway_secs"]) {
                    exist = true;
                    break;
                }
            }
            if (!exist) {
                out.push(freq);
            }
        }
    }
    return out;
}

export async function getCurrentFrequency(pkg, provider, tripId) {
    var freqs = await getFrequencies(pkg, provider, tripId);
    var now = Date.now();
    var startDate;
    var endDate;
    var splits;
    for (var freq of freqs) {
        if (isCurrentFrequency(freq)) {
            return freq;
        }
    }
    return false;
}

export async function getFrequencies(pkg, provider, tripId) {
    return await db["frequencies"].where("[package+provider+trip_id]")
        .equals([pkg, provider, tripId]).toArray();
}

export async function searchRoutes(query) {
    return await db["routes"].where("route_short_name")
        .startsWithIgnoreCase(query).toArray();
}

export async function getAllRouteNames(offset, length, noDup) {
    return new Promise((resolve, reject) => {
        var out = [];
        db["routes"].filter(route => {
            return route["route_short_name"].length > offset;
        }).each(route => {
            var str = route["route_short_name"].substr(offset, length);
            if (!noDup || !out.includes(str)) {
                out.push(str);
            }
        }).then(function () {
            resolve(out);
        });
    });
}

export async function searchNearbyStops(lat, lng, range, sorted = true) {
    var stops = await db["stops"].toArray();
    var out = [];
    stops.forEach(stop => {
        var distance = Misc.geoDistance(lat, lng, stop["stop_lat"], stop["stop_lon"]);
        if (distance <= range) {
            out.push({
                distance: distance,
                stop: stop
            });
        }
    });

    if (sorted) {
        out.sort((a, b) => {
            return a.distance - b.distance;
        });
    }
    return out;
}

export function searchStopRoutes(pkg, provider, stopId) {
    return new Promise((resolve, reject) => {
        var pathIds = [];
        var routeIds = [];
        var routes = {};
        var stopTimes = {};
        var trips = {};
        var st = Date.now();
        return getStopTimePathsByStopId(pkg, provider, stopId).then(function (out) {
            for (var stopTime of out) {
                var pathId = stopTime["path_id"];
                pathIds.push([pkg, provider, pathId]);
                stopTimes[pathId] = stopTime;
            }
            //console.log("PATH DONE: " + (Date.now() - st));
        }).then(function () {
            st = Date.now();
            db["trips"].where("[package+provider+path_id]").anyOf(pathIds).each(trip => {
                var routeId = trip["route_id"];
                trips[routeId] = trip;
                routeIds.push([pkg, provider, routeId]);
            }).then(function () {
                //console.log("EACH DONE: " + (Date.now() - st));
                st = Date.now();
                db["routes"].where("[package+provider+route_id]").anyOf(routeIds).each(route => {
                    var routeId = route["route_id"];
                    routes[routeId] = route;
                }).then(function () {
                    //console.log("EACH2 DONE: " + (Date.now() - st));
                    resolve({
                        routes: routes,
                        trips: trips,
                        stopTimes: stopTimes
                    });
                });
            });
        });
    });
}

//
// Getters
//

export async function getAgencies() {
    return await db["agency"].toArray();
}

export async function getAgency(pkg, provider, agencyId) {
    return await db["agency"].where("[package+provider+agency_id]")
        .equals([pkg, provider, agencyId]).first();
}

export async function getRoute(pkg, provider, routeId) {
    return await db["routes"].where("[package+provider+route_id]")
        .equals([pkg, provider, routeId]).first();
}

export async function getTrip(pkg, provider, tripId) {
    return await db["trips"].where("[package+provider+trip_id]")
        .equals([pkg, provider, tripId]).first();
}

export async function getTripsByPathId(pkg, provider, pathId){
    return await db["trips"].where("[package+provider+path_id]")
        .equals([pkg, provider, pathId]).toArray();
}

export async function getTripsByRouteId(pkg, provider, routeId) {
    return await db["trips"].where("[package+provider+route_id]")
        .equals([pkg, provider, routeId]).toArray();
}

export async function getStop(pkg, provider, stopId) {
    return await db["stops"].where("[package+provider+stop_id]")
        .equals([pkg, provider, stopId]).first();
}

export async function getCalendar(pkg, provider, serviceId) {
    return await db["calendar"].where("[package+provider+service_id]")
        .equals([pkg, provider, serviceId]).first();
}

export async function getCalendarDates(pkg, provider, serviceId) {
    return await db["calendar_dates"].where("[package+provider+service_id]")
        .equals([pkg, provider, serviceId]).toArray();
}

export async function getStopTimePathsByStopId(pkg, provider, stopId) {
    return await db["stop_time_paths"].where("[package+provider+stop_id]")
        .equals([pkg, provider, stopId]).sortBy("path_id");
}

export async function getStopTimePathByPathId(pkg, provider, pathId) {
    return await db["stop_time_paths"].where("[package+provider+path_id]")
        .equals([pkg, provider, pathId]).sortBy("stop_sequence");
}

export function getStopTimesByStopId(pkg, provider, stopId) {
    return new Promise((resolve, reject) => {
        if (isStopTimesValid(pkg, provider)) {
            db["stop_times"].where("[package+provider+stop_id]")
                .equals([pkg, provider, stopId]).sortBy("trip_id").then(function (rows) {
                    resolve(rows);
                });
        } else {
            var worker = new Worker("./workers/stoptimes-raw-by-stop-id.worker.js", { type: 'module' });
            worker.postMessage({
                pkg: pkg,
                id: provider,
                stopId: stopId
            });
            worker.addEventListener("message", function (evt) {
                var out = evt.data;
                for (var datum of out) {
                    datum["package"] = pkg;
                    datum["provider"] = provider;
                }
                resolve(out);
            });
        }
    });
}

export function getStopTimesByTripId(pkg, provider, tripId) {
    return new Promise((resolve, reject) => {
        if (isStopTimesValid(pkg, provider)) {
            db["stop_times"].where("[package+provider+trip_id]")
                .equals([pkg, provider, tripId]).sortBy("stop_sequence").then(function (rows) {
                    resolve(rows);
                });
        } else {
            var worker = new Worker("./workers/stoptimes-raw-by-trip-id.worker.js", { type: 'module' });
            worker.postMessage({
                pkg: pkg,
                id: provider,
                tripId: tripId
            });
            worker.addEventListener("message", function (evt) {
                var out = evt.data;
                for (var datum of out) {
                    datum["package"] = pkg;
                    datum["provider"] = provider;
                }
                resolve(out);
            });
        }
    });
}

export async function validateStopTimes(pkg, provider) {
    var rawRowsArray = await db["stop_times_raw"].where("[package+provider]")
        .equals([pkg, provider]).first();
    var dbRows = await db["stop_times"].where("[package+provider]")
        .equals([pkg, provider]).count();
    return stopTimesValid[pkg + "," + provider] = rawRowsArray.rows.length === dbRows;
}

export function isStopTimesValid(pkg, provider) {
    return false;
    return stopTimesValid[pkg + "," + provider];
}
