import Dexie from 'dexie';
import * as Misc from './gtw-misc';

export var db = new Dexie("gtfs");

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
    "fare_attributes": "[package+provider+fare_id],[package+provider]",
    "fare_rules": "[package+provider+fare_id],[package+provider]",
    "stop_times_raw": "[package+provider]",
    "fare_attributes_raw": "[package+provider]",
    "fare_rules_raw": "[package+provider]"
});

//
// Misc
//

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

export function searchNearbyStops(lat, lng, range, sorted = true) {
    return new Promise((resolve, reject) => {
        var out = [];
        db["stops"].each(stop => {
            var distance = Misc.geoDistance(lat, lng, stop["stop_lat"], stop["stop_lon"]);
            if (distance <= range) {
                out.push({
                    distance: distance,
                    stop: stop
                });
            }
        }).then(function () {
            if (sorted) {
                out.sort(function (a, b) {
                    return a.distance - b.distance;
                });
            }
            resolve(out);
        });
    });
}

export function searchStopRoutes(pkg, provider, stopId) {
    return new Promise((resolve, reject) => {
        var tripIds = [];
        var routeIds = [];
        var routes = {};
        var stopTimes = {};
        var trips = {};
        return getStopTimesByStopId(pkg, provider, stopId).then(function (out) {
            for (var stopTime of out) {
                var tripId = stopTime["trip_id"];
                tripIds.push([pkg, provider, tripId]);
                stopTimes[tripId] = stopTime;
            }
        }).then(function () {
            db["trips"].where("[package+provider+trip_id]").anyOf(tripIds).each(trip => {
                var routeId = trip["route_id"];
                trips[routeId] = trip;
                routeIds.push([pkg, provider, routeId]);
            }).then(function () {
                db["routes"].where("[package+provider+route_id]").anyOf(routeIds).each(route => {
                    var routeId = route["route_id"];
                    routes[routeId] = route;
                }).then(function () {
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

var stopTimesValid = {};

export async function validateStopTimes(pkg, provider) {
    var rawRowsArray = await db["stop_times_raw"].where("[package+provider]")
        .equals([pkg, provider]).first();
    var dbRows = await db["stop_times"].where("[package+provider]")
        .equals([pkg, provider]).count();
    return stopTimesValid[pkg + "," + provider] = rawRowsArray.rows.length === dbRows;
}

stopTimesValid["gtwp-hktransit,hktransit"] = true;

export function isStopTimesValid(pkg, provider) {
    return stopTimesValid[pkg + "," + provider];
}
