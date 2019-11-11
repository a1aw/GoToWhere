//City Data: Transit ETA
import * as Misc from './gtw-misc';
import * as Database from './gtw-db';

var providers = [];

var cache = {};

export function clearCache() {
    cache = {};
}

export function timeDifference(a, b) {
    var x = a.hr * 60 + a.min;
    var y = b.hr * 60 + b.min;
    return x - y;
}

export function registerProvider(type, id, name, provider) {
    if (!provider.fetchEta || typeof provider.fetchEta !== "function" ||
        !provider.fetchDatabase || typeof provider.fetchDatabase !== "function" ||
        !provider.isDatabaseUpdateNeeded || typeof provider.isDatabaseUpdateNeeded !== "function") {
        throw new Error("Error: " + id + " does not contain fetchEta, fetchDatabase or isDatabaseUpdateNeeded function!");
    }

    provider.type = type;
    provider.id = id;
    provider.db = false;

    if (typeof name === "object") {
        provider["name"] = name["default"];
        for (var key in name) {
            provider["name_" + key] = name[key];
        }
    } else {
        provider.name = name;
    }

    provider.getRoute = function (routeId) {
        if (!this.db) {
            return false;
        }
        var i;
        for (i = 0; i < this.db.routes.length; i++) {
            if (this.db.routes[i].routeId === routeId) {
                return this.db.routes[i];
            }
        }
        return false;
    };

    provider.getRouteById = function (routeId) {
        var routes = this.getRoutes();
        for (var route of routes) {
            if (route.routeId === routeId) {
                return route;
            }
        }
        return false;
    };

    provider.getRoutes = function () {
        return this.db ? this.db.routes : [];
    };

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
            proms.push(Database.getTransitReferenceByProvider(provider.id).then(function (db) {
                if (!db) {
                    return;
                }
                var TransitEta = require('./gtw-citydata-transit-eta.js');
                var provider = TransitEta.getProvider(db.provider);
                if (provider) {
                    provider.db = db;
                }
            }).catch(reject));
        }
        Promise.all(proms).then(function () {
            var needs = {};
            var proms = [];
            var p;
            for (const provider of providers) {
                if (provider.db) {
                    console.log("has db " + provider.id);
                    p = new Promise((resolve, reject) => {
                        provider.isDatabaseUpdateNeeded(resolve, reject, provider.db.version);
                    });
                    p.then(function (needed) {
                        console.log("update: " + provider.id + " " + needed);
                        needs[provider.id] = needed;
                    }).catch(function () {
                        console.error("Error: Database check update for " + provider.id + " failed!");
                        needs[provider.id] = false;
                    });
                    proms.push(p);
                } else {
                    console.log("No db found for " + provider.id);
                    needs[provider.id] = true;
                }
            }
            Promise.all(proms).then(function () {
                var proms = [];
                var p;
                console.log(needs);
                for (const provider of providers) {
                    if (needs[provider.id]) {
                        p = new Promise((resolve, reject) => {
                            provider.fetchDatabase(resolve, reject);
                        });
                        p.then(function (data) {
                            const { type, provider, routes, stops, version } = data;

                            if (!type || !provider || !routes || !stops || !version) {
                                console.error("Error: Returned reference database is in wrong structure for " + (provider ? provider : "unknown provider") + ".");
                                return;
                            }

                            var db = {
                                type: type,
                                provider: provider,
                                routes: routes,
                                stops: stops,
                                version: version
                            };

                            var TransitEta = require('./gtw-citydata-transit-eta.js');
                            var providerObj = TransitEta.getProvider(data.provider);
                            providerObj.db = db;

                            return Database.putTransitReference(db);
                        });
                        proms.push(p);
                    }
                }
                Misc.allProgress(proms, pc).then(resolve).catch(reject);
            });
        }).catch(reject);
    });
}

export function fetchEta(opt) {
    return new Promise((resolve, reject) => {
        var proms = [];
        var count = 0;
        for (var providerId of opt.etaProviders) {
            proms.push(new Promise((resolve, reject) => {
                var provider = getProvider(providerId);

                if (!provider) {
                    resolve();
                    console.log("Could not find registered Transit ETA provider with name \"" + providerId + "\"");
                    return;
                }

                count++;

                var key = providerId + "-" + opt.routeId + "-" + opt.selectedPath + "-" + opt.stopId;
                var cached = cache[key];
                var now = new Date();

                if (cached && (now - cached.lastFetched) > 30000) {
                    cached = false;
                    delete cache[key];
                }

                if (!cached) {
                    var global = this;
                    var p = new Promise((resolve, reject) => {
                        provider.fetchEta(resolve, reject, opt);
                    });
                    p.then(function (scheObj) {
                        if (!scheObj) {
                            resolve(false);
                            return;
                        }

                        const { schedules, options } = scheObj;
                        if (!schedules || !options) {
                            console.error("Error: Plugin returned a TransitSchedule object with invalid structure.");
                            reject(opt, "Invalid TransitSchedule structure");
                            return;
                        }

                        for (var sche of schedules) {
                            if (sche.type === undefined || sche.provider === undefined || sche.serverTime === undefined || sche.msg === undefined && sche.time === undefined || isNaN(parseInt(sche.serverTime))) {
                                console.error("Error: Plugin returned a TransitSchedule object with invalid schedules.");
                                reject(opt, "Invalid TransitSchedule schedules");
                                return;
                            }
                        }

                        var time = new Date();

                        var out = {
                            schedules: schedules,
                            options: options
                        };

                        cache[key] = {
                            lastFetched: time.getTime(),
                            data: out
                        };

                        resolve(out);
                    }).catch(function (err) {
                        reject(opt, err);
                    });
                } else {
                    resolve(cached.data);
                }
            }));
        }
        Promise.all(proms).then(function (values) {
            if (count > 0) {
                var schedules = [];
                for (var value of values) {
                    if (value && value.schedules) {
                        schedules = schedules.concat(value.schedules);
                    }
                }
                schedules.sort(function (a, b) {
                    if (!a.time) {
                        return 1;
                    } else if (!b.time) {
                        return -1;
                    }
                    return a.time - b.time;
                });
                resolve({
                    schedules: schedules,
                    options: opt,
                    code: 0
                })
            } else if (opt.etaProviders && opt.etaProviders.length > 0) {
                resolve({
                    code: -2,
                    options: opt
                });
            } else {
                resolve({
                    code: -1,
                    options: opt
                });
            }
        }).catch(reject);
    });
}

export function getCache() {
    return cache;
}