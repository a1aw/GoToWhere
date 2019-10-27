//City Data: Transit Stops

define(function (require, exports, module) {
    var Misc = require("gtw-misc");
    var Database = require("gtw-db");

    exports.providers = [];

    exports.registerProvider = function (type, id, name, provider) {
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

        exports.providers.push(provider);
    };

    exports.unregisterProvider = function (id) {
        var found = -1;
        for (var i = 0; i < exports.providers.length; i++) {
            if (exports.providers[i].id === id) {
                found = i;
            }
        }
        exports.providers.splice(found, 1);
    }

    exports.getProviders = function () {
        return exports.providers;
    }

    exports.getProvider = function (id) {
        for (var provider of exports.providers) {
            if (provider.id === id) {
                return provider;
            }
        }
        return false;
    };

    exports.fetchAllDatabase = function (pc) {
        return new Promise((resolve, reject) => {
            var proms = [];
            for (var provider of exports.providers) {
                proms.push(Database.getTransitStopsByProvider(provider.id).then(function (db) {
                    if (!db) {
                        return;
                    }
                    var TransitStops = require("gtw-citydata-transit-stops");
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
                for (var provider of exports.providers) {
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
                    var proms = [];
                    var p;
                    for (var provider of exports.providers) {
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

                                var TransitStops = require("gtw-citydata-transit-stops");
                                var providerObj = TransitStops.getProvider(data.provider)
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
    };

    exports.getAllStops = function () {
        var allStops = [];
        for (var provider of exports.providers) {
            if (provider) {
                var stops = provider.getStops();
                if (stops && stops.length > 0) {
                    allStops = allStops.concat(stops);
                }
            }
        }
        return allStops;
    }

    exports.getAllStopsNearby = function (lat, lng, range, sorted = true) {
        var allStops = exports.getAllStops();
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
    };

    exports.getStopById = function (stopId) {
        var allStops = exports.getAllStops();
        var i;
        for (i = 0; i < allStops.length; i++) {
            if (stopId === allStops[i].stopId) {
                return allStops[i];
            }
        }
        return false;
    };
});