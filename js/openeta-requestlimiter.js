//OpenETA Request Limiter

var RequestLimiter = function () {

	this.requests = [];

	this.duration = 1000;

	this.running = false;

	this.queue = function (func, args) {
		if (typeof func !== "function") {
			throw new TypeError("The variable must be a 'function'.");
		}
		this.requests.push([func, args]);
		return func;
	}

	this.start = function () {
		if (this.running) {
			return;
		}

		this.running = true;
		this.dispatch();
	}

	this.dispatch = function () {
		var next = this.requests.shift();
		var global = this;

		if (next && typeof next[0] === 'function') {
			next[0](next[1]);
		}

		if (this.running) {
			setTimeout(function () {
				global.dispatch();
			}, this.duration);
		}
	}

	this.stop = function () {
		this.running = false;
	}

};