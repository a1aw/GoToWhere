//City Data: Transit Routes

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
            proms.push(Database.getTransitRoutesByProvider(provider.id).then(function (db) {
                if (!db) {
                    return;
                }
                var TransitRoutes = require("./gtw-citydata-transit-routes");
                var provider = TransitRoutes.getProvider(db.provider);
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
                var proms = [];
                var p;
                for (var provider of providers) {
                    if (needs[provider.id]) {
                        p = new Promise((resolve, reject) => {
                            provider.fetchDatabase(resolve, reject);
                        });
                        p.then(function (data) {
                            const { type, provider, routes, version } = data;

                            if (!type || !provider || !routes || !version) {
                                console.error("Error: Returned routes database is in wrong structure for " + (provider ? provider : "unknown provider") + ".");
                                return;
                            }

                            var db = {
                                type: type,
                                provider: provider,
                                routes: routes,
                                version: version
                            };

                            var TransitRoutes = require("./gtw-citydata-transit-routes");
                            var providerObj = TransitRoutes.getProvider(data.provider);
                            providerObj.db = db;

                            return Database.putTransitRoutes(db);
                        });
                        proms.push(p);
                    }
                }
                Misc.allProgress(proms, pc).then(resolve).catch(reject);
            });
        }).catch(reject);
    });
}

export function getAllRoutes() {
    var allRoutes = [];
    for (var provider of providers) {
        if (provider) {
            var routes = provider.getRoutes();
            if (routes && routes.length > 0) {
                allRoutes = allRoutes.concat(routes);
            }
        }
    }
    return allRoutes;
}

export function getRouteById(routeId) {
    var allRoutes = getAllRoutes();
    var i;
    for (i = 0; i < allRoutes.length; i++) {
        if (routeId === allRoutes[i].routeId) {
            return allRoutes[i];
        }
    }
    return false;
}