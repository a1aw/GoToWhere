//GTW Request Limiter

define(function (require, exports, module) {
    exports.functions = {};

    exports.registerFunction = function (name, func) {
        exports.functions[name] = func;
    }

    exports.unregisterFunction = function (name) {
        if (!exports.functions[name]) {
            return;
        }
        delete exports.functions[name];
    }

    exports.call = function (name, ...args) {
        if (!exports.functions[name]) {
            return false;
        }
        return exports.functions[name](args);
    }
});