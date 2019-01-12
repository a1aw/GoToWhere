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

	this.requestAllRoutes = function () {
		var mt = new MultiTasker();
		var tasks = [];
		var args = [];
		for (var provider of this.providers) {
			if (provider) {
				args.push([provider, mt]);
				tasks.push(function (arg) {
					RequestLimiter.queue(function (arg) {
						arg[0].fetchRoutes().done(function () {
							console.log(arg[1]);
							arg[1].dispatch();
						}).progressChange(function (progress) {
							arg[1].setTaskProgress(progress);
						});
					}, arg);
				});
			}
		}
		mt.setArgs(args);
		mt.setTasks(tasks);
		mt.start();
		return mt;
	}

}

class MultiTasker {

	constructor() {
		this.pcHandlers = [];
		this.handlers = [];
		this.args = [];
		this.tasks = [];
		this.remain = 0;
		this.taskProgress = 0;
	}

	setArgs(args) {
		this.args = args;
	}

	setTasks(tasks) {
		this.tasks = tasks;
		this.remain = tasks.length;
	}

	getTotalProgress() {
		console.log(this.taskProgress);
		return (this.tasks.length - this.remain + 1 + this.taskProgress / 100.0) / this.tasks.length * 100.0;
	}

	setTaskProgress(value) {
		if (value < 0) {
			value = 0;
		} else if (value > 100) {
			value = 100;
		}
		this.taskProgress = value;

		for (var pcHandler of this.pcHandlers) {
			if (pcHandler && typeof pcHandler === 'function') {
				pcHandler(this.getTotalProgress());
			}
		}
	}

	getTaskProgress() {
		return taskProgress;
	}

	start() {
		console.log(this)
		for (var i = 0; i < this.tasks.length; i++) {
			this.taskProgress = 0;
			var task = this.tasks[i];
			if (task && typeof task === 'function') {
				if (this.args && this.args.length > i) {
					task(this.args[i]);
				} else {
					task();
				}
			}
		}
	}

	dispatch() {
		for (var pcHandler of this.pcHandlers) {
			if (pcHandler && typeof pcHandler === 'function') {
				pcHandler(this.getTotalProgress());
			}
		}

		if (this.remain > 1) {
			this.remain--;
			return;
		}

		for (var handler of this.handlers) {
			if (handler && typeof handler === 'function') {
				handler(arguments);
			}
		}
	}

	progressChange(func) {
		if (func && typeof func === 'function') {
			if (this.tasks.length == 0) {
				func(100.0);
			}
			this.pcHandlers.push(func);
		}
		return this;
	}

	done(func) {
		if (func && typeof func === 'function') {
			if (this.tasks.length == 0) {
				func();
			}
			this.handlers.push(func);
		}
		return this;
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

	getRoutes() {
		return null;
	}

	fetchRoutes() {
		return null;
	}

	getETA(etaHandler) {
		return null;
	}

	fetchETA(etaHandler) {
		return null;
	}

}

class ProgressListener {

	constructor() {
		this.pcHandlers = [];
		this.handlers = [];
		this.progress = 0;
	}

	dispatch() {
		for (var handler of this.handlers) {
			if (handler && typeof handler === 'function') {
				handler(arguments);
			}
		}
	}

	setProgress(value) {
		console.log("seting to " + value)
		if (value < 0) {
			value = 0;
		} else if (value > 100) {
			value = 100;
		}
		this.progress = value;

		for (var pcHandler of this.pcHandlers) {
			if (pcHandler && typeof pcHandler === 'function') {
				console.log("reporting")
				pcHandler(this.progress);
			}
		}
	}

	getProgress() {
		return progress;
	}

	progressChange(func) {
		if (func && typeof func === 'function') {
			if (this.progress != 0) {
				func(this.progress);
			}
			this.pcHandlers.push(func);
		}
		return this;
	}

	done(func) {
		if (func && typeof func === 'function') {
			this.handlers.push(func);
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