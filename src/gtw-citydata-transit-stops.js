//City Data: Transit Stops

import * as Misc from './gtw-misc';
import * as Database from './gtw-db';

var providers = [];

export function registerProvider(type, id, name, provider) {
    if (!provider.fetchDatabase || typeof provider.fetchDatabase !== "function" ||
        !provider.isDatabaseUpdateNeeded || typeof provider.isDatabaseUpdateNeeded !== "function") {
        throw new Error("Error: " + name + " does not contain fetchDatabase or isDatabaseUpdateNeeded function!");
    }

    provider.type = type;
    provider.id = id;

    if (typeof name === "object") {
        provider["name"] = name["default"];
        for (var key in name) {
            provider["name_" + key] = name[key];
        }
    } else {
        provider.name = name;
    }

    provider.db = false;

    provider.getStop = function (stopId) {
        if (!this.db) {
            return false;
        }
        var i;
        for (i = 0; i < this.db.stops.length; i++) {
            if (this.db.stops[i].stopId === stopId) {
                return this.db.stops[i];
            }
        }
        return false;
    };

    provider.getStopById = function (stopId) {
        var stops = this.getStops();
        for (var stop of stops) {
            if (stop.stopId === stopId) {
                return stop;
            }
        }
        return false;
    };

    provider.getStops = function () {
        return this.db ? this.db.stops : [];
    };
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

export function fetchAllDatabase(pc) {
    return new Promise((resolve, reject) => {
        var proms = [];
        for (var provider of providers) {
            proms.push(Database.getTransitStopsByProvider(provider.id).then(function (db) {
                if (!db) {
                    return;
                }
                var TransitStops = require("./gtw-citydata-transit-stops");
                var provider = TransitStops.getProvider(db.provider);
                if (provider) {
                    provider.db = db;
                }
            }).catch(reject));
        }
        Promise.all(proms).then(function () {
            var needs = {};
            var proms = [];
            var p;
            for (var provider of providers) {
                if (provider.db) {
                    p = new Promise((resolve, reject) => {
                        provider.isDatabaseUpdateNeeded(resolve, reject, provider.db.version);
                    });
                    p.then(function (needed) {
                        needs[provider.id] = needed;
                    }).catch(function () {
                        console.error("Error: Database check update for " + provider.id + " failed!");
                        needs[provider.id] = false;
                    });
                    proms.push(p);
                } else {
                    needs[provider.id] = true;
                }
            }
            Promise.all(proms).then(function () {
                console.log(needs);
                var proms = [];
                var p;
                for (var provider of providers) {
                    if (needs[provider.id]) {
                        p = new Promise((resolve, reject) => {
                            provider.fetchDatabase(resolve, reject);
                        });
                        p.then(function (data) {
                            const { type, provider, stops, version } = data;

                            if (!type || !provider || !stops || !version) {
                                console.error("Error: Returned stops database is in wrong structure for " + (provider ? provider : "unknown provider") + ".");
                                return;
                            }

                            var db = {
                                type: type,
                                provider: provider,
                                stops: stops,
                                version: version
                            };

                            var TransitStops = require("./gtw-citydata-transit-stops");
                            var providerObj = TransitStops.getProvider(data.provider);
                            providerObj.db = db;

                            return Database.putTransitStops(db);
                        });
                        proms.push(p);
                    }
                }
                Misc.allProgress(proms, pc).then(resolve).catch(reject);
            });
        }).catch(reject);
    });
}

export function getAllStops() {
    var allStops = [];
    for (var provider of providers) {
        if (provider) {
            var stops = provider.getStops();
            if (stops && stops.length > 0) {
                allStops = allStops.concat(stops);
            }
        }
    }
    return allStops;
}

export function getAllStopsNearby(lat, lng, range, sorted = true) {
    var allStops = getAllStops();
    var stops = [];
    var stop;
    var d;
    for (var i = 0; i < allStops.length; i++) {
        stop = allStops[i];
        d = Misc.geoDistance(lat, lng, stop.lat, stop.lng);
        if (d <= range) {
            stops.push({
                stop: stop,
                distance: d
            });
        }
    }

    if (sorted) {
        stops.sort(function (a, b) {
            if (a.distance < b.distance) {
                return -1;
            } else if (a.distance > b.distance) {
                return 1;
            } else {
                return 0;
            }
        });
    }

    return stops;
}

export function getStopById(stopId) {
    var allStops = getAllStops();
    var i;
    for (i = 0; i < allStops.length; i++) {
        if (stopId === allStops[i].stopId) {
            return allStops[i];
        }
    }
    return false;
}