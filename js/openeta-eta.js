//OpenETA ETA Manager

const TransitType = {
	TRANSIT_BUS: "TRANSIT_BUS",
	TRANSIT_METRO: "TRANSIT_METRO",
	TRANSIT_TRAIN: "TRANSIT_TRAIN",
	TRANSIT_FERRY: "TRANSIT_FERRY"
};

var ETAManager = function () {

	this.providers = [];

	this.handlers = [];

	this.registerProvider = function (provider) {
		if (!(provider instanceof ETAProvider)) {
			throw new TypeError("The variable 'provider' must be a 'ETAProvider'.");
		}
		this.providers.push(provider);
	}

	this.unregisterProvider = function (provider) {
		var i = this.providers.indexOf(provider);
		if (i == -1) {
			return;
		}
		this.providers.splice(i, 1);
	}

	this.getProviders = function () {
		return this.providers;
	}

	this.addHandler = function (handler) {
		if (!(handler instanceof ETAHandler)) {
			throw new TypeError("The variable 'handler' must be a 'ETAHandler'.");
		}
		this.handlers.push(handler);
	}

	this.removeHandler = function (handler) {
		var i = this.handlers.indexOf(phandler);
		if (i == -1) {
			return;
		}
		this.handlers.splice(i, 1);
	}

	this.getHandlers = function () {
		return this.handlers;
	}

	this.requestAllETA = function () {
		for (var handler in handlers) {
			if (handler) {
				var _handler = handler;
				RequestLimiter.queue(function () {
					_handler.fetchETA();
				});
			}
		}
	}

}

class ETAProvider {

	constructor(transit, name) {
		this.transit = transit;
		this.name = name;
	}

	makeHandler(options) {
		return new ETAHandler({
			transit: this.transit,
			provider: this,
			route: options.route,
			stop: options.stop,
			selectedPath: options.selectedPath
		});
	}

	getETA(etaHandler) {
		return null;
	}

	fetchETA(etaHandler) {
		return null;
	}

}

class FetchListener {

	constructor() {
		this.handlers = [];
	}

	dispatch() {
		for (var handler in handlers) {
			if (handler && typeof handler === 'function') {
				handler(arguments);
			}
		}
	}

	done(func) {
		if (func && typeof func === 'function') {
			handlers.add(func);
		}
		return this;
	}

}

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

}

class ETAData extends TransitObject{

	constructor(options) {
		super(options);
	}
}

class Route extends TransitObject{

	constructor(data) {
		super(data);
		const { routeId, paths } = data;
		this.routeId = routeId;
		this.paths = paths;
	}

}

class Stop extends TransitObject {

	constructor(data) {
		super(data);
		const { stopId, stopNameChi, stopNameEng, addrChi, addrEng, lat, lng } = data;
		this.stopId = stopId;
		this.stopNameChi = stopNameChi;
		this.stopNameEng = stopNameEng;
		this.addrChi = addrChi;
		this.addrEng = addrEng;
		this.lat = lat;
		this.lng = lng;
	}

}