//OpenETA ETA Manager

const TransitType = {
	TRANSIT_BUS: "TRANSIT_BUS",
	TRANSIT_METRO: "TRANSIT_METRO",
	TRANSIT_TRAIN: "TRANSIT_TRAIN",
	TRANSIT_FERRY: "TRANSIT_FERRY"
};

define(function (require, exports, module) {
    var Misc = require("gtw-misc");

    exports.timer = 0;

    exports.providers = [];

    exports.cache = {};

    exports.clearCache = function () {
        exports.cache = {};
    }

    exports.timeDifference = function (a, b) {
        var x = a.hr * 60 + a.min;
        var y = b.hr * 60 + b.min;
        return x - y;
    }

    exports.registerProvider = function (transit, name, provider) {
        provider.transit = transit;
        provider.name = name;
        provider.dbKey = "transit-db-" + name;
        provider.db = false;

        if (localStorage) {
            var dbJson = localStorage.getItem(provider.dbKey);
            if (dbJson) {
                provider.db = JSON.parse(dbJson);
            }
            delete dbJson;
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
    }

    exports.unregisterProvider = function (name) {
        var found = -1;
        for (var i = 0; i < exports.providers.length; i++) {
            if (exports.providers[i].name === name) {
                found = i;
            }
        }
        exports.providers.splice(found, 1);
    }

    exports.getProviders = function () {
        return exports.providers;
    }

    exports.getProvider = function (providerName) {
        for (var provider of exports.providers) {
            if (provider.name === providerName) {
                return provider;
            }
        }
        return false;
    };

    exports.fetchAllDatabase = function (pc) {
        return new Promise((resolve, reject) => {
            var needs = {};
            var proms = [];
            var p;
            for (var provider of exports.providers) {
                if (provider.db) {
                    p = new Promise((resolve, reject) => {
                        provider.isDatabaseUpdateNeeded(resolve, reject, provider.db.version);
                    });
                    p.then(function (needed) {
                        needs[provider.name] = needed;
                    }).catch(function () {
                        console.error("Error: Database check update for " + provider.name + " failed!")
                        needs[provider.name] = false;
                    });
                    proms.push(p);
                } else {
                    needs[provider.name] = true;
                }
            }
            Promise.all(proms).then(function () {
                console.log(needs);
                var proms = [];
                var p;
                for (const provider of exports.providers) {
                    if (needs[provider.name]) {
                        p = new Promise((resolve, reject) => {
                            provider.fetchDatabase(resolve, reject);
                        });
                        p.then(function (data) {
                            console.log(data);
                            const { routes, stops, version } = data;

                            if (!routes || !stops || !version) {
                                console.error("Error: Returned database is in wrong structure for " + provider.name);
                                return;
                            }

                            var db = {
                                routes: routes,
                                stops: stops,
                                version: version
                            };
                            localStorage.setItem(provider.dbKey, JSON.stringify(db));
                            provider.db = db;
                        });
                        proms.push(p);
                    }
                }
                Misc.allProgress(proms, pc).then(resolve).catch(reject);
            });
        });
    }

    exports.fetchEta = function (opt) {
        return new Promise((resolve, reject) => {
            var provider = exports.getProvider(opt.provider);

            if (!provider) {
                throw new Error("Could not find registered Transit provider with name \"" + opt.provider + "\"");
            }

            var key = opt.provider + "-" + opt.routeId + "-" + opt.selectedPath + "-" + opt.stopId;
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
                    console.log("Returned ETA data");
                    if (!scheObj) {
                        resolve(false);
                        return;
                    }

                    const { schedules, serverTime, options } = scheObj;
                    if (!schedules || !serverTime || !options) {
                        console.log(scheObj);
                        console.error("Error: Plugin returned a TransitSchedule object with invalid structure.");
                        reject(opt, "Invalid TransitSchedule structure");
                        return;
                    }

                    if (isNaN(parseInt(serverTime))) {
                        console.error("Error: Plugin returned a TransitSchedule object with invalid server time.");
                        reject(opt, "Invalid server time");
                        return;
                    }

                    //TODO: Validate schedules

                    //for (var sche of schedules) {
                    //}

                    var time = new Date();

                    var out = {
                        schedules: schedules,
                        serverTime: serverTime,
                        options: options
                    };

                    global.cache[key] = {
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
        });
    }

    /*
    exports.getEta = function (handler) {
        var provider = exports.getProvider(handler.provider);

        if (!provider) {
            throw new Error("Could not find registered ETA provider with name \"" + handler.provider + "\"");
        }

        return provider.getEta(handler);
    }
    */

    exports.getHandlers = function () {
        return exports.handlers;
    }

    exports.getAllRoutes = function () {
        var allRoutes = [];
        for (var provider of exports.providers) {
            if (provider) {
                var routes = provider.getRoutes();
                if (routes && routes.length > 0) {
                    allRoutes = allRoutes.concat(routes);
                }
            }
        }
        return allRoutes;
    }

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

    exports.getAllStopsNearbyCoord = function (lat, lng, range, sorted = true) {
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
    }

    exports.getStopById = function (stopId) {
        var allStops = exports.getAllStops();
        var i;
        for (i = 0; i < allStops.length; i++) {
            if (stopId === allStops[i].stopId) {
                return allStops[i];
            }
        }
        return false;
    }

    exports.getStopIndex = function (route, stop, selectedPath) {
        if (selectedPath < 0 || selectedPath >= route.paths.length) {
            return -1;
        }
        var path = route.paths[selectedPath];
        for (var i = 0; i < path.length; i++) {
            var stopId = path[i];
            if (stop.stopId === stopId) {
                return i;
            }
        }
        return -1;
    }

    exports.searchRoutesOfStop = function (stop) {
        var out = [];

        var allRoutes = exports.getAllRoutes();
        for (var route of allRoutes) {
            var paths = route.paths;
            for (var i = 0; i < paths.length; i++) {
                var path = paths[i];
                for (var stopId of path) {
                    if (stop.stopId === stopId) {
                        out.push({
                            route: route,
                            bound: i
                        });
                    }
                }
            }
        }

        return out;
    }

    exports.getRoutesOfStop = function (stop) {
        var result = exports.searchRoutesOfStop(stop);

        return result.map(function (value, index) {
            return value[0];
        });;
    }
});

/*
class TransitObject {

	constructor(data) {
		const { transit, provider } = data;
		this.transit = transit;
		this.provider = provider;
	}

}

class ETAHandler extends TransitObject{

	constructor(options) {
		super(options);
		const { route, stop, selectedPath } = options;
		this.route = route;
		this.stop = stop;
		this.selectedPath = selectedPath;
	}

	fetchETA() {
		return this.provider.fetchETA(this);
	}

	getETA() {
		return this.provider.getETA(this);
	}

	toKey() {
		return this.route.routeId + "-" + this.stop.stopId + "-" + this.selectedPath;
	}

}

class ETAData {

	constructor(schedules, serverTime) {
		this.schedules = schedules;
		this.serverTime = serverTime;
	}

	getRemainingMinutes(schedule) {
		if (typeof schedule === "undefined") {
			if (this.schedules.length == 0) {
				return false;
			}
			schedule = this.schedules[0];
		} else if (typeof schedule === "number") {

			schedule = this.schedules[schedule];
		}

		if (typeof schedule === "TransitSchedule") {
			return schedule.getRemainingMinutes(this.serverTime);
		} else {
			return false;
		}
	}
}

class TransitTime {

	constructor(hr, min) {
		this.hr = hr;
		this.min = min;
	}

	difference(time) {
		var a = this.hr * 60 + this.min;
		var b = time.hr * 60 + time.min;
		return a - b;
	}

}

class TransitSchedule extends TransitObject {

	constructor(data) {
		super(data);
		const { isLive, isOutdated, hasTime, hasMsg, time, msg, features } = data;
		this.isLive = isLive;
		this.isOutdated = isOutdated;
		this.hasTime = hasTime;
		this.hasMsg = hasMsg;
		this.time = time;
		this.msg = msg;
		this.features = features;
	}

	getRemainingMinutes(serverTime) {
		if (!this.hasTime || !this.time) {
			return false;
		}
		return this.time.difference(serverTime);
	}

}

class Route extends TransitObject{

	constructor(data) {
		super(data);
		const { routeId, paths, ext } = data;
		this.routeId = routeId;
		this.paths = paths;
		this.ext = ext;
	}

}

class Stop extends TransitObject {

	constructor(data) {
		super(data);
		const { stopId, stopName, addr, lat, lng, ext } = data;
		this.stopId = stopId;
		this.stopName = stopName;
		this.addr = addr;
		this.lat = lat;
		this.lng = lng;
		this.ext = ext;
	}

}
*/