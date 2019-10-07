//GTW Logging

define(function (require, exports, module) {
    var maxEntries = 1000;

    var global = this;

    var logEntries = [];
    /*
    var jsTrace = console.trace;
    console.trace = function (msg) {
        global.log("console", msg, -1);
    };

    var jsDebug = console.debug;
    console.debug = function (msg) {
        global.log("console", msg, -2);
    };

    var jsInfo = console.log;
    console.log = function (msg) {
        global.log("console", msg, 0);
    };

    var jsWarn = console.warn;
    console.warn = function (msg) {
        global.log("console", msg, 1);
    };

    var jsError = console.error;
    console.error = function (msg) {
        global.log("console", msg, 2);
    };
    */
    exports.printObject = true;

    exports.toConsole = function (msg, level) {
        if (level === -2) {
            jsTrace(msg);
        } else if (level === -1) {
            jsDebug(msg);
        } else if (level === 0) {
            jsInfo(msg);
        } else if (level === 1) {
            jsWarn(msg);
        } else if (level === 2) {
            jsError(msg);
        }
    };

    exports.toLogger = function (tag, msg, time, level) {
        if (logEntries.length >= maxEntries) {
            logEntries.shift();
        }
        logEntries.push({
            time: time,
            msg: msg,
            level: level
        });
    };

    exports.getEntries = function (){
        return logEntries;
    }

    exports.log = function (tag = "unknown", msg, level = 0) {
        var time = Date.now();

        if (typeof msg === "object") {
            if (exports.printObject) {
                exports.toConsole("[" + new Date(time).toLocaleString() + "] [" + tag + "]", level);
                exports.toConsole(msg, level);
            } else {
                var pmsg = JSON.stringify(msg);
                exports.toConsole("[" + new Date(time).toLocaleString() + "] [" + tag + "] " + pmsg, level);
            }
        } else {
            exports.toConsole("[" + new Date(time).toLocaleString() + "] [" + tag + "] " + msg, level);
        }

        exports.toLogger(tag, msg, time, level);
    };

    exports.trace = function (tag, msg) {
        exports.log(tag, msg, -2);
    };

    exports.debug = function (tag, msg) {
        exports.log(tag, msg, -1);
    };

    exports.info = function (tag, msg) {
        exports.log(tag, msg, 0);
    };

    exports.warn = function (tag, msg) {
        exports.log(tag, msg, 1);
    };

    exports.error = function (tag, msg) {
        exports.log(tag, msg, 2);
    };
});