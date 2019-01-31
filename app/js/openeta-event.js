//OpenETA Event Manager

const EVENTS = {
	EVENT_UI_SHOW: "EVENT_UI_SHOW",
	EVENT_UI_HIDE: "EVENT_UI_HIDE",
	EVENT_UI_HOME: "EVENT_UI_HOME"
};

var EventManager = function () {

	this.eventListeners = {};

	this.dispatchEvent = function (event) {
		if (!this.eventListeners[event]) {
			return;
		}
		for (var listener of this.eventListeners[event]) {
			if (listener) {
				listener();
			} else {
				this.removeListener(listener);
			}
		}
	}

	this.addListener = function (event, listener) {
		if (!this.eventListeners[event]) {
			this.eventListeners[event] = [];
		}
		this.eventListeners[event].push(listener);
	}

	this.removeListener = function (event, listener) {
		if (!this.eventListeners[event]) {
			return;
		}
		var i = this.eventListeners[event].indexOf(listener);
		if (i == -1) {
			return;
		}
		this.eventListeners[event].splice(i, 1);
	}

	this.removeAllListeners = function () {
		this.eventListeners = {};
	}

}