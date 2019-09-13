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

    var ETAProvider = function (packageName, providerObjName, transit, name) {
        this.packageName = packageName;
        this.providerObjName = providerObjName;
        this.transit = transit;
        this.name = name;
        var plugin = PluginLoader.plugins[packageName];
        if (!plugin) {
            throw new Error("No such plugin \"" + packageName + "\" installed! Cannot initialize ETA provider.");
        }
        this.interpreter = plugin.interpreter;

        this.makeHandler = function(options) {
            return new ETAHandler({
                transit: this.transit,
                provider: this,
                route: options.route,
                stop: options.stop,
                selectedPath: options.selectedPath
            });
        }

        this.getRoutes = function () {
            return this.runCode("getRoutes");
        }

        this.getStops = function () {
            return this.runCode("getStops");
        }

        this.fetchDatabase = function () {
            var global = this;
            return new Promise(function (resolve, reject) {
                global.runCode("fetchDatabase", resolve, reject);
            });
        }

        this.getEta = function (etaHandler) {
            return this.runCode("getEta", etaHandler);
        }

        this.fetchEta = function (etaHandler) {
            return new Promise(function (resolve, reject) {
                global.runCode("fetchEta", resolve, reject, etaHandler);
            });
        }

        this.runCode = function (codeName, ...args) {
            if (args) {
                this.interpreter.setProperty(this.interpreter.getScope(), "_args", this.interpreter.nativeToPseudo(args));
                this.interpreter.appendCode(this.providerObjName + "." + codeName + ".apply(this, _args);");
            } else {
                this.interpreter.appendCode(this.providerObjName + "." + codeName + "();");
            }
            this.interpreter.run();
            return this.interpreter.pseudoToNative(this.interpreter.value);
        }
    }

    exports.timer = 0;

    exports.providers = [];

    exports.handlers = {};

    exports.forceUpdate = function () {
        console.log("Updating!")
        var d = new Date();
        var cache;
        for (var key in exports.handlers) {
            cache = exports.handlers[key];
            if (cache.lastAccess && d.getTime() - cache.lastAccess > 60000) {
                console.log("Invalidate inuse ETA cache: " + key)
                delete exports.handlers[key];
            } else {
                cache.handler.fetchETA();
            }
        }
    }

    exports.start = function () {
        var global = this;
        exports.timer = setInterval(function () {
            global.forceUpdate();
        }, 30000);
    }

    exports.stop = function () {
        clearInterval(exports.timer);
    }

    exports.registerProvider = function (package, providerObjName, transit, name) {
        exports.providers.push(new ETAProvider(package, providerObjName, transit, name));
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

    exports.request = function (options) {
        var key = options.provider.name + "-" + options.route.routeId + "-" + options.selectedPath + "-" + options.stop.stopId;

        var d = new Date();
        var cache = exports.handlers[key];
        if (cache) {
            exports.handlers[key].lastAccess = d.getTime();
            return cache.handler;
        } else {
            var h = options.provider.makeHandler({
                route: options.route,
                selectedPath: options.selectedPath,
                stop: options.stop
            });
            exports.handlers[key] = {
                lastAccess: d.getTime(),
                handler: h
            };
            return h;
        }
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
        for (var stop of allStops) {
            if (stopId === stop.stopId) {
                return stop;
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

    exports.legacy = 0;

    exports.searchRoutesOfStop = function (stop) {
        var out = [];

        console.log("Para: " + stop.stopId);
        console.log(exports.legacy);
        exports.legacy += 1;
        var allRoutes = exports.getAllRoutes();
        for (var route of allRoutes) {
            var paths = route.paths;
            for (var i = 0; i < paths.length; i++) {
                var path = paths[i];
                for (var stopId of path) {
                    if (stop.stopId === stopId) {
                        console.log("Found: " + route.routeId);
                        out.push([route, i]);
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

    exports.requestAllETA = function () {
        for (var handler of handlers) {
            if (handler) {
                var _handler = handler;
                RequestLimiter.queue(function () {
                    _handler.fetchETA();
                });
            }
        }
    }

    exports.requestAllDatabase = function (pc) {
        var proms = [];
        var pm;
        for (var provider of exports.providers) {
            if (provider) {
                pm = provider.fetchDatabase();
                if (pm) {
                    proms.push(pm);
                }
            }
        }
        return Misc.allProgress(proms, pc);
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