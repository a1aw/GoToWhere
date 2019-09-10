//OpenETA Request Limiter

var Func = function () {

	this.functions = {};

	this.registerFunction = function (name, func) {
		this.functions[name] = func;
	}

	this.unregisterFunction = function (name) {
		if (!this.functions[name]) {
			return;
		}
		delete this.functions[name];
	}

	this.call = function (name, ...args) {
		if (!this.functions[name]) {
			return false;
		}
		return this.functions[name](args);
	}

}