//City Data: Transit ETA

define(function (require, exports, module) {
    var Misc = require("gtw-misc");
    var Database = require("gtw-db");

    exports.timer = 0;

    exports.providers = [];

    exports.cache = {};

    exports.clearCache = function () {
        exports.cache = {};
    };

    exports.timeDifference = function (a, b) {
        var x = a.hr * 60 + a.min;
        var y = b.hr * 60 + b.min;
        return x - y;
    };

    exports.registerProvider = function (type, id, name, provider) {
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
        }

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
    };

    exports.getProviders = function () {
        return exports.providers;
    };

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
                proms.push(Database.getTransitReferenceByProvider(provider.id).then(function (db) {
                    if (!db) {
                        return;
                    }
                    var TransitEta = require("gtw-citydata-transit-eta");
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
                    console.log(needs);
                    for (var provider of exports.providers) {
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

                                var TransitEta = require("gtw-citydata-transit-eta");
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
    };

    exports.fetchEta = function (opt) {
        return new Promise((resolve, reject) => {
            var proms = [];
            var count = 0;
            for (var providerId of opt.etaProviders) {
                proms.push(new Promise((resolve, reject) => {
                    var provider = exports.getProvider(providerId);
                    
                    if (!provider) {
                        resolve();
                        console.log("Could not find registered Transit ETA provider with name \"" + providerId + "\"");
                        return;
                    }

                    count++;

                    var key = providerId + "-" + opt.routeId + "-" + opt.selectedPath + "-" + opt.stopId;
                    var cached = exports.cache[key];
                    var now = new Date();

                    if (cached && (now - cached.lastFetched) > 30000) {
                        cached = false;
                        delete exports.cache[key];
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

                            global.cache[key] = {
                                lastFetched: time.getTime(),
                                data: out
                            };

                            resolve(out);
                        }).catch(function (err) {
                            if (err) {
                                console.error(err);
                            }
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
                        /*
                        if (!a.time) {
                            return 1;
                        } else if (!b.time) {
                            return -1;
                        }
                        */
                        if (!a.time || !b.time) {
                            return 0;
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
    };

    exports.getCache = function () {
        return exports.cache;
    };

});