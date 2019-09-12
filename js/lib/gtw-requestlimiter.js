//GTW Request Limiter

define(function (require, exports, module) {
    exports.requests = [];

    exports.duration = 1000;

    exports.running = false;

    exports.queue = function (func, args) {
        if (typeof func !== "function") {
            throw new TypeError("The variable must be a 'function'.");
        }
        exports.requests.push([func, args]);
        return func;
    }

    exports.start = function () {
        if (exports.running) {
            return;
        }

        exports.running = true;
        exports.dispatch();
    }

    exports.dispatch = function () {
        var next = exports.requests.shift();
        var global = this;

        if (next && typeof next[0] === 'function') {
            next[0](next[1]);
        }

        if (exports.running) {
            setTimeout(function () {
                global.dispatch();
            }, exports.duration);
        }
    }

    exports.stop = function () {
        exports.running = false;
    }
});