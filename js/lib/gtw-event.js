//GTW Event Manager

define(function (require, exports, module) {
    exports.EVENTS = {
        EVENT_UI_SHOW: "EVENT_UI_SHOW",
        EVENT_UI_HIDE: "EVENT_UI_HIDE",
        EVENT_UI_HOME: "EVENT_UI_HOME"
    };

    exports.eventListeners = {};

    exports.dispatchEvent = function (event) {
        if (!exports.eventListeners[event]) {
            return;
        }
        for (var listener of exports.eventListeners[event]) {
            if (listener) {
                listener();
            } else {
                exports.removeListener(listener);
            }
        }
    }

    exports.addListener = function (event, listener) {
        if (!exports.eventListeners[event]) {
            exports.eventListeners[event] = [];
        }
        exports.eventListeners[event].push(listener);
    }

    exports.removeListener = function (event, listener) {
        if (!exports.eventListeners[event]) {
            return;
        }
        var i = exports.eventListeners[event].indexOf(listener);
        if (i == -1) {
            return;
        }
        exports.eventListeners[event].splice(i, 1);
    }

    exports.removeAllListeners = function () {
        exports.eventListeners = {};
    }
});