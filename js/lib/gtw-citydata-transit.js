//OpenETA ETA Manager

const TransitType = {
	TRANSIT_BUS: "TRANSIT_BUS",
	TRANSIT_METRO: "TRANSIT_METRO",
	TRANSIT_TRAIN: "TRANSIT_TRAIN",
	TRANSIT_FERRY: "TRANSIT_FERRY"
};

define(function (require, exports, module) {
    var Misc = require("gtw-misc");
    var PluginLoader = require("gtw-pluginloader");
    var RequestLimiter = require("gtw-requestlimiter");

    var TransitProvider = function (packageName, providerObjName, transit, name) {
        this.packageName = packageName;
        this.providerObjName = providerObjName;
        this.transit = transit;
        this.name = name;
        var plugin = PluginLoader.plugins[packageName];
        if (!plugin) {
            throw new Error("No such plugin \"" + packageName + "\" installed! Cannot initialize TransitProvider.");
        }
        this.interpreter = plugin.interpreter;
        this.dbKey = "transit-db-" + packageName + "-" + name;
        this.db = false;
        this.cache = {};

        if (localStorage) {
            var dbJson = localStorage.getItem(this.dbKey);
            if (dbJson) {
                this.db = JSON.parse(dbJson);
            }
            delete dbJson;
        }

        this.makeHandler = function(options) {
            return {
                transit: this.transit,
                provider: this.name,
                route: options.route,
                stop: options.stop,
                selectedPath: options.selectedPath
            };
        }

        this.getRouteById = function (routeId) {
            var routes = this.getRoutes();
            for (var route of routes) {
                if (route.routeId === routeId) {
                    return route;
                }
            }
            return false;
        }

        this.getRoutes = function () {
            return this.routes;
        }

        this.getStopById = function (stopId) {
            var stops = this.getStops();
            for (var stop of stops) {
                if (stop.stopId === stopId) {
                    return stop;
                }
            }
            return false;
        }

        this.getStops = function () {
            return this.stops;
        }

        this.isDatabaseUpdateNeeded = function () {
            return new Promise((resolve, reject) => {
                if (this.db) {
                    var p = this.runCode("isDatabaseUpdateNeeded", this.db.version);
                    p.then(function (needed) {
                        if (!needed) {
                            global.routes = global.db.routes;
                            global.stops = global.db.stops;
                            global.interpreter.setProperty(global.interpreter.getScope(), "routes", global.interpreter.nativeToPseudo(global.routes));
                            global.interpreter.setProperty(global.interpreter.getScope(), "stops", global.interpreter.nativeToPseudo(global.stops));
                            delete global.db;
                        }
                        resolve(needed);
                    }).catch(function (err) {
                        reject(err);
                    });
                } else {
                    resolve(true);
                }
            });
        }
        
        this.fetchDatabase = function () {
            var global = this;
            var p = new Promise(function (resolve, reject) {
                global.runCode("fetchDatabase", resolve, reject);
            });
            p.then(function (data) {
                console.log(data);
                const { routes, stops, version } = data;

                if (!routes || !stops || !version) {
                    console.error("Error: Returned database is in wrong structure.");
                    return;
                }

                localStorage.setItem(global.dbKey, JSON.stringify({
                    routes: routes,
                    stops: stops,
                    version: version
                }));

                global.routes = routes;
                global.stops = stops;
                global.interpreter.setProperty(global.interpreter.getScope(), "routes", global.interpreter.nativeToPseudo(global.routes));
                global.interpreter.setProperty(global.interpreter.getScope(), "stops", global.interpreter.nativeToPseudo(global.stops));
            });
            return p;
        }

        /*
        this.getEta = function (etaHandler) {
            return this.runCode("getEta", etaHandler);
        }
        */

        this.fetchEta = function (etaHandler) {
            console.log("Return promise ETA");
            return new Promise((resolve, reject) => {
                console.log("Enter promise eta")
                var key = JSON.stringify(etaHandler);
                var cached = this.cache[key];
                var now = new Date();

                if (cached && (now - cached.lastFetched) > 30000) {
                    console.log("Invalidate")
                    cached = false;
                    delete this.cache[key];
                }

                if (!cached) {
                    console.log("Not cached")
                    var global = this;
                    var p = new Promise(function (resolve, reject) {
                        global.runCode("fetchEta", resolve, reject, etaHandler);
                    });
                    p.then(function (scheObj) {
                        if (!scheObj) {
                            resolve(false);
                            return;
                        }

                        const { schedules, serverTime, handler } = scheObj;
                        if (!schedules || !serverTime) {
                            console.error("Error: Plugin returned a TransitSchedule object with invalid structure.");
                            reject();
                            return;
                        }

                        if (isNaN(parseInt(serverTime.hr)) || isNaN(parseInt(serverTime.min))) {
                            console.error("Error: Plugin returned a TransitSchedule object with invalid server time.");
                            reject();
                            return;
                        }

                        //TODO: Validate schedules

                        //for (var sche of schedules) {
                        //}

                        var time = new Date();

                        global.cache[key] = {
                            lastFetched: time.getTime(),
                            data: scheObj
                        };

                        console.log("scheObj");
                        console.log(scheObj);

                        resolve(scheObj);
                    }).catch(function(err){
                        reject(err);
                    });
                } else {
                    //cached.lastAccess = now.getTime();
                    console.log("cache");
                    console.log(cached);
                    resolve(cached.data);
                }
            });
        }

        this.executions = [];

        this.runCode = function (codeName, ...args) {
            return new Promise((resolve, reject) => {
                this.executions.push([codeName, args, resolve, reject]);
            });
        }

        var global = this;
        this.timer = setInterval(function () {
            var exec = global.executions.shift();
            if (exec) {
                var codeName = exec[0];
                var args = exec[1];
                if (args) {
                    global.interpreter.setProperty(global.interpreter.getScope(), "_args", global.interpreter.nativeToPseudo(args));
                    //global.interpreter.appendCode("var _args = " + JSON.stringify(args) + ";");
                    global.interpreter.appendCode(global.providerObjName + "." + codeName + ".apply(this, _args);");
                } else {
                    global.interpreter.appendCode(global.providerObjName + "." + codeName + "();");
                }
                try {
                    global.interpreter.run();
                } catch (err) {
                    console.error("Error: Error occurred in \"" + global.packageName + "\" when running code \"" + codeName + "\"");
                    exec[3](err);
                    throw err;
                }
                console.log("exec resolve!");
                exec[2](global.interpreter.pseudoToNative(global.interpreter.value));
            }
        }, 100);
    }

    exports.timer = 0;

    exports.providers = [];

    exports.handlers = {};

    /*
    exports.forceUpdate = function () {
        var d = new Date();
        var cache;
        for (var key in exports.handlers) {
            cache = exports.handlers[key];
            if (cache.lastAccess && d.getTime() - cache.lastAccess > 30000) {
                console.log("Invalidate inuse ETA cache: " + key)
                delete exports.handlers[key];
            } else {
                exports.fetchEta(cache.handler);
            }
        }
    }
    */

    exports.clearCache = function () {
        exports.handlers = {};
    }

    /*
    exports.start = function () {
        var global = this;
        exports.timer = setInterval(function () {
            global.forceUpdate();
        }, 30000);
    }

    exports.stop = function () {
        clearInterval(exports.timer);
    }
    */

    exports.timeDifference = function (a, b) {
        var x = a.hr * 60 + a.min;
        var y = b.hr * 60 + b.min;
        return x - y;
    }

    exports.registerProvider = function (package, providerObjName, transit, name) {
        exports.providers.push(new TransitProvider(package, providerObjName, transit, name));
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

    exports.request = function (options) {
        var provider = exports.getProvider(options.provider);

        if (!provider) {
            throw new Error("Could not find registered Transit provider with name \"" + options.provider + "\"");
        }

        var key = options.provider + "-" + options.route.routeId + "-" + options.selectedPath + "-" + options.stop.stopId;

        var d = new Date();
        var cache = exports.handlers[key];
        if (cache) {
            exports.handlers[key].lastAccess = d.getTime();
            return cache.handler;
        } else {
            var h = provider.makeHandler({
                route: options.route.routeId,
                selectedPath: options.selectedPath,
                stop: options.stop.stopId
            });
            exports.handlers[key] = {
                lastAccess: d.getTime(),
                handler: h
            };
            return h;
        }
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

    exports.fetchEta = function (handler) {
        var provider = exports.getProvider(handler.provider);

        if (!provider) {
            throw new Error("Could not find registered ETA provider with name \"" + handler.provider + "\"");
        }

        return provider.fetchEta(handler);
    }

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
                        console.log("Found: " + route.routeId);
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

    exports.requestAllDatabase = function (pc) {
        return new Promise((resolve, reject) => {
            console.log("is update needed");
            var updateNeeded = {};
            var proms = [];
            for (const provider of exports.providers) {
                console.log(provider);
                if (provider) {
                    var p = provider.isDatabaseUpdateNeeded();
                    p.then(function (needed) {
                        console.log(provider.name + ":" + needed);
                        updateNeeded[provider.name] = needed;
                    }).catch(function (err) {
                        console.error("Error occurred in plugin while checking is DB update needed, forcing to update: " + err);
                        updateNeeded[provider.name] = true;
                    });
                    proms.push(p);
                }
            }
            Promise.all(proms).then(function () {
                console.log(updateNeeded);
                var proms = [];
                var pm;
                for (var provider of exports.providers) {
                    console.log(provider);
                    if (provider && updateNeeded[provider.name]) {
                        console.log("Update is needed for " + provider.name);
                        pm = provider.fetchDatabase();
                        console.log("Fetch");
                        if (pm) {
                            proms.push(pm);
                        }
                    }
                }
                Misc.allProgress(proms, pc).then(function () {
                    resolve();
                }).catch(function () {
                    reject();
                });
            });
        });
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