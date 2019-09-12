// GTW Plugin Loader

define(function (require, exports, module) {
    var Misc = require("gtw-misc");
    var Cors = require("gtw-cors");
    var ETAManager = require("gtw-eta");

    var InterpreterRunner = function (interpreter, doneFunc) {
        this.interpreter = interpreter;
        this.doneFunc = doneFunc;

        var global = this;

        this.run = function () {
            this.nextStep();
        }

        this.nextStep = function () {
            var x = 0;
            var st = false;
            do {
                st = global.interpreter.step();
                x++;
            } while (x < 1000 && st);
            if (st) {
                window.setTimeout(global.nextStep, 0);
            } else {
                console.log("ExecDone");
                if (typeof global.doneFunc === "function") {
                    global.doneFunc();
                }
            }
        }
    };

    exports.plugins = {};

    exports.getLoadedPlugins = function () {
        return exports.plugins.length;
    };

    exports.decode = function (code) {
        var json = JSON.parse(Base64.decode(code));
        //TODO Compression / encryption stuff
        return json;
    };

    exports.install = function (package, checksum) {
        var localStorage = window.localStorage;
        if (!localStorage) {
            return false;
        }

        var json = {};
        json.method = "online";
        json.checksum = checksum;
        json.package = package;
        localStorage.setItem(package, JSON.stringify(json));
        return true;
    };

    exports.uninstall = function (package) {
        var localStorage = window.localStorage;
        if (!localStorage) {
            return false;
        }

        localStorage.removeItem(package);
        return true;
    };

    exports.getPlugin = function (package) {
        return exports.plugins[package];
    };

    exports.compareVersion = function (ver0, ver1) {
        var ver0sub = ver0.split(".");
        var ver1sub = ver1.split(".");

        if (ver0sub[0] > ver1sub[0]) {
            return 1;
        } else if (ver0sub[0] < ver1sub[0]) {
            return -1;
        }

        if (ver0sub[1] > ver1sub[1]) {
            return 1;
        } else if (ver0sub[1] < ver1sub[1]) {
            return -1;
        }

        if (ver0sub[2] > ver1sub[2]) {
            return 1;
        } else if (ver0sub[2] < ver1sub[2]) {
            return -1;
        }

        return 0;
    };

    exports.load = function () {
        var json;
        for (var package in exports.plugins) {
            json = exports.plugins[package];

            if (json.info.dependencies) {
                for (var dependency in json.info.dependencies) {
                    if (!exports.plugins[dependency]) {
                        alert("The package \"" + package + "\" requires \"" + dependency + "\" to be installed. You must install it in Plugin Manager in order to enable this plugin.");
                        continue;
                    }

                    if (exports.compareVersion(exports.plugins[dependency].info.version, json.info.dependencies[dependency]) == -1) {
                        alert("The package \"" + package + "\" requires a newer version of \"" + dependency + "\" to be installed. You must install a new version in Plugin Manager in order to enable this plugin.");
                        continue;
                    }

                    exports.plugins[package].priority++;
                    exports.plugins[dependency].priority--;
                }
            }
        }

        console.log(exports.plugins);

        var loadSeq = [];
        for (var package in exports.plugins) {
            loadSeq.push({
                package: package,
                priority: exports.plugins[package].priority
            });
        }
        loadSeq.sort(function (a, b) {
            return a.priority - b.priority;
        });

        return new Promise(function (resolve, reject) {
            exports._postLoadSeq(resolve, loadSeq);
        });
    };

    exports._postLoadSeq = function (resolve, loadSeq) {
        var seq = loadSeq.shift();

        if (!seq) {
            resolve();
            return;
        }

        var pluginJson = exports.plugins[seq.package];
        var json = pluginJson.info;
        var interpreter = pluginJson.interpreter;

        window["t"] = interpreter;
        interpreter.run();

        console.log(interpreter);

        var scope = interpreter.getScope();

        if (!interpreter.hasProperty(scope, "onload")) {
            var t = "Error: Main class of \"" + pluginJson.package + "\" does not contain onload function";
            console.log(t);
            cmt = document.createComment(t);
            document.head.appendChild(cmt);
            resolve();
            return;
        }

        interpreter.appendCode("onload();");
        interpreter.run();

        var result = interpreter.value;

        if (result) {
            var t = "Error: \"" + pluginJson.package + "\" reported error " + result + " for onload() function.";
            pluginJson.status = -1;
            pluginJson.msg = t;

            console.log(t);
            cmt = document.createComment(t);
            alert(t);
            document.head.appendChild(cmt);
            exports._postLoadSeq(resolve, loadSeq);
            /*} else if (promise instanceof Promise) {
                promise.then(function (status) {
                    pluginJson.status = 0;
                    delete pluginJson.msg;
                    exports._postLoadSeq(resolve, loadSeq);
                });
                promise.catch(function (error) {
                    var t = "Error: \"" + pluginJson.package + "\" reported error for onload() function after promise.";
                    pluginJson.status = -1;
                    pluginJson.msg = t;
    
                    console.log(t);
                    cmt = document.createComment(t);
                    alert(t);
                    document.head.appendChild(cmt);
                    exports._postLoadSeq(resolve, loadSeq);
                });*/
        } else {
            pluginJson.status = 0;
            delete pluginJson.msg;
            exports._postLoadSeq(resolve, loadSeq);
        }
    }

    exports.download = function (pc) {
        var localStorage = window.localStorage;
        if (!localStorage) {
            return false;
        }

        var initFunc = function (interpreter, scope) {
            //Expose APIs
            interpreter.setProperty(scope, "atob", interpreter.createNativeFunction(function (x) {
                return atob(x);
            }));
            interpreter.setProperty(scope, "btoa", interpreter.createNativeFunction(function (x) {
                return btoa(x);
            }));
            interpreter.setProperty(scope, "console", interpreter.nativeToPseudo(console));
            interpreter.setProperty(scope, "TransitType", interpreter.nativeToPseudo(TransitType));
            interpreter.setProperty(scope, "registerEtaProvider", interpreter.createNativeFunction(function (package, providerObjName, transit, name) {
                ETAManager.registerProvider(package, providerObjName, transit, name);
            }));
            interpreter.setProperty(scope, "registerCors", interpreter.createNativeFunction(function (domain, allowCors) {
                Cors.register(domain, allowCors);
            }));
            interpreter.setProperty(scope, "fast_arraySearch", interpreter.createNativeFunction(function (p_array, p_element) {
                var i;
                var array = interpreter.pseudoToNative(p_array);
                var element = interpreter.pseudoToNative(p_element);
                return array.includes(element);
            }));
            interpreter.setProperty(scope, "fast_createStopFromRoutePath", interpreter.createNativeFunction(function (p_stopsArray, p_pathArray, p_map) {
                var i;
                var stopsArray = interpreter.pseudoToNative(p_stopsArray);
                var pathArray = interpreter.pseudoToNative(p_pathArray);
                var map = interpreter.pseudoToNative(p_map);
                for (i = 0; i < pathArray.length; i++) {
                    var stop = pathArray[i];
                    if (!Misc.isSamePropertyValueInArray(stopsArray, "stopId", stop[map["stopId"]])) {
                        return interpreter.nativeToPseudo({
                            transit: TransitType.TRANSIT_BUS,
                            provider: map["provider"],
                            stopId: stop[map["stopId"]],
                            stopName: stop[map["stopName"]],
                            addr: stop[map["addr"]],
                            lat: parseFloat(stop[map["lat"]]),
                            lng: parseFloat(stop[map["lng"]])
                        });
                    }
                }
                return false;
            }));
            interpreter.setProperty(scope, "ajax", interpreter.createNativeFunction(function (settings) {
                var data = interpreter.pseudoToNative(settings);
                var out = $.extend({}, data);
                var funcKeys = ["beforeSend", "complete", "dataFilter", "error", "success", "xhr"];
                for (var funcKey of funcKeys) {
                    if (data[funcKey]) {
                        const val = data[funcKey];
                        out[funcKey] = function (...args) {
                            console.log("Doing " + val);
                            console.log(args);
                            interpreter.setProperty(interpreter.getScope(), "_args", interpreter.nativeToPseudo(args));
                            interpreter.appendCode(val + ".apply(this, _args);");
                            new InterpreterRunner(interpreter).run();
                            console.log("NSDone");
                            return interpreter.value;
                        };
                    }
                }
                console.log(data);
                console.log(out);
                $.ajax(out);
            }));
        };

        var getInfoFunc = function (json) {
            var url = "https://plugins.openeta.ml/repos/" + json.package + "/info.json";
            return new Promise((resolve, reject) => {
                $.ajax({
                    url: url,
                    dataType: "json",
                    success: function (infoJson) {
                        console.log(infoJson);
                        getPluginFunc(resolve, reject, json, infoJson);
                    },
                    error: function () {
                        exports.plugins[json.package] = {
                            package: json.package,
                            local: json,
                            status: -1,
                            msg: "Could not fetch information from plugins server."
                        };
                    }
                });
            });
        };

        var getPluginFunc = function (resolve, reject, localJson, json) {
            return $.ajax({
                url: "https://plugins.openeta.ml/repos/" + json.package + "/plugin.js",
                dataType: "text",
                success: function (pluginJs) {
                    try {
                        var cmt = document.createComment("Plugin: " + json.package);
                        document.head.appendChild(cmt);

                        var node = document.createElement("script");
                        node.innerHTML = pluginJs;
                        document.head.appendChild(node);

                        console.log(pluginJs);
                        var interpreter = new Interpreter(pluginJs, initFunc);

                        exports.plugins[json.package] = {
                            package: json.package,
                            local: localJson,
                            info: json,
                            script: pluginJs,
                            priority: 100,
                            status: 1,
                            interpreter: interpreter,
                            msg: "Not enabled"
                        };
                        resolve();
                    } catch (err) {
                        console.log("Error loading " + key + ": " + err);
                        reject(err);
                    }
                },
                error: function (err) {
                    exports.plugins[json.package] = {
                        package: json.package,
                        local: localJson,
                        info: json,
                        status: -1,
                        msg: "Could not fetch plugin script from plugins server."
                    };
                    reject(err);
                }
            });
        }

        var total = 0;
        var completed = 0;
        var proms = [];
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (!key.startsWith("gtwp-")) {
                continue;
            }
            total++;

            var data = localStorage.getItem(key);

            var json = JSON.parse(data);

            if (!json.package || !json.method || !json.checksum) {
                var t = "Error: \"" + key + "\" is missing a method, package or checksum";
                console.error(t);
                cmt = document.createComment(t);
                document.head.appendChild(cmt);
                continue;
            }

            if (json.method === "online") {
                proms.push(getInfoFunc(json));
            } else if (json.method === "offline") {
                if (!json.info || !json.script) {
                    console.log("Error: Missing script or info");
                    continue;
                }

                var interpreter = new Interpreter(json.script, initFunc);
                exports.plugins[json.package] = {
                    package: json.package,
                    local: json,
                    info: json.info,
                    script: json.script,
                    priority: 100,
                    status: 1,
                    interpreter: interpreter,
                    msg: "Not enabled"
                };
            } else {
                console.log("Error: Unknown plugin method");
            }
        }
        return Misc.allProgress(proms, pc);
    }
});