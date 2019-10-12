// GTW Plugin Loader

define(function (require, exports, module) {
    var Misc = require("gtw-misc");
    var Cors = require("gtw-cors");
    var RequestLimiter = require("gtw-requestlimiter");
    var TransitManager = require("gtw-citydata-transit");

    //Code to create callback functions
    const PRE_CODE =
        "var __gtwFunctions = {};" +
        "var __gtwFunctionsInc = 0;" +
        "var createFunction = function(func) {" +
        "    var num = ++__gtwFunctionsInc;" +
        "    __gtwFunctions[num] = func;" +
        "    return num;" +
        "};" +
        "var executeFunction = function(num, args) {" +
        "    var func = __gtwFunctions[num];" +
        "    if (typeof func === \"function\") {" +
        "        var val = func.apply(this, args);" +
        "        delete __gtwFunctions[num];" +
        "        return val;" +
        "    }" +
        "};"
        ;

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

            try {
                do {
                    st = global.interpreter.step();
                    x++;
                } while (x < 2500 && st);
                if (st) {
                    window.setTimeout(global.nextStep, 0);
                } else {
                    if (typeof global.doneFunc === "function") {
                        global.doneFunc();
                    }
                }
            } catch (err) {
                console.error("Error: Error occurred in \"" + this.packageName + "\" when using InterpreterRunner.");
                throw err;
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

    exports.install = function (packageName, checksum) {
        var localStorage = window.localStorage;
        if (!localStorage) {
            return false;
        }

        var json = {};
        json.method = "online";
        json.checksum = checksum;
        json.package = packageName;
        localStorage.setItem(packageName, JSON.stringify(json));
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

    exports.runCode = function (package, codeName, args) {
        var plugin = exports.plugins[package];
        if (!plugin) {
            return false;
        }
        console.log("Return new promise for " + package + ":" + codeName);
        return new Promise((resolve, reject) => {
            var x = [codeName, args, resolve, reject];
            console.log("Push these");
            console.log(x);
            plugin.executions.push(x);
        });
    };
    
    var timer = setInterval(function () {
        for (var key in exports.plugins) {
            var plugin = exports.plugins[key];

            if (plugin.executions.length == 0) {
                continue;
            }
            var exec = plugin.executions.shift();
            if (exec) {
                console.log("Execution for " + key);
                console.log(exec);
                const codeName = exec[0];
                const args = exec[1];
                console.log("codeName: " + codeName);
                console.log("args:");
                console.log(args);
                if (args) {
                    console.log("Has args");
                    plugin.interpreter.setProperty(plugin.interpreter.getScope(), "_args", plugin.interpreter.nativeToPseudo(args));
                    //global.interpreter.appendCode("var _args = " + JSON.stringify(args) + ";");
                    plugin.interpreter.appendCode(codeName + ".apply(this, _args);");
                } else {
                    console.log("No args");
                    plugin.interpreter.appendCode(codeName + "();");
                }
                console.log("Run till complete");
                try {
                    plugin.interpreter.run();
                } catch (err) {
                    console.error("Error: Error occurred in \"" + plugin.package + "\" when running code \"" + codeName + "\"");
                    exec[3](err);
                    throw err;
                }
                console.log("Finish");
                var out = plugin.interpreter.pseudoToNative(plugin.interpreter.value);
                exec[2](out);
            }
        }
    }, 100);

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
        for (var packageName in exports.plugins) {
            json = exports.plugins[packageName];

            if (json.info.dependencies) {
                for (var dependency in json.info.dependencies) {
                    if (!exports.plugins[dependency]) {
                        alert("The package \"" + packageName + "\" requires \"" + dependency + "\" to be installed. You must install it in Plugin Manager in order to enable this plugin.");
                        continue;
                    }

                    if (exports.compareVersion(exports.plugins[dependency].info.version, json.info.dependencies[dependency]) == -1) {
                        alert("The package \"" + packageName + "\" requires a newer version of \"" + dependency + "\" to be installed. You must install a new version in Plugin Manager in order to enable this plugin.");
                        continue;
                    }

                    exports.plugins[packageName].priority++;
                    exports.plugins[dependency].priority--;
                }
            }
        }

        var loadSeq = [];
        for (var packageName in exports.plugins) {
            loadSeq.push({
                package: packageName,
                priority: exports.plugins[packageName].priority
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

        var scope = interpreter.getScope();

        if (!interpreter.hasProperty(scope, "onload")) {
            var t = "Error: Main class of \"" + pluginJson.package + "\" does not contain onload function";
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
            interpreter.setProperty(scope, "Number", interpreter.nativeToPseudo(Number));
            interpreter.setProperty(scope, "Uint8Array", interpreter.nativeToPseudo(Uint8Array));
            interpreter.setProperty(scope, "TextEncoder", interpreter.nativeToPseudo(TextEncoder));
            interpreter.setProperty(scope, "console", interpreter.nativeToPseudo(console));
            interpreter.setProperty(scope, "TransitType", interpreter.nativeToPseudo(TransitType));
            interpreter.setProperty(scope, "registerTransitProvider", interpreter.createNativeFunction(function (packageName, providerObjName, transit, name) {
                TransitManager.registerProvider(packageName, providerObjName, transit, name);
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
                var out = [];
                for (i = 0; i < pathArray.length; i++) {
                    var stop = pathArray[i];
                    if (!Misc.isSamePropertyValueInArray(stopsArray, "stopId", stop[map["stopId"]])) {
                        out.push({
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
                return interpreter.nativeToPseudo(out);
            }));
            interpreter.setProperty(scope, "ajax", interpreter.createNativeFunction(function (settings) {
                var data = interpreter.pseudoToNative(settings);
                var out = $.extend({}, data);
                var funcKeys = ["beforeSend", "complete", "dataFilter", "error", "success", "xhr"];
                for (var funcKey of funcKeys) {
                    if (data[funcKey]) {
                        const val = data[funcKey];
                        const pkg = data.package;
                        out[funcKey] = function (...args) {
                            //TODO: The following code has extreme bugs that may occur in a plugin with multiple providers using AJAX
                            //      Must be implemented to queue to run code

                            interpreter.setProperty(interpreter.getScope(), "_val", interpreter.nativeToPseudo(val));
                            interpreter.setProperty(interpreter.getScope(), "_args", interpreter.nativeToPseudo(args));
                            interpreter.appendCode("executeFunction(_val, _args);");
                            new InterpreterRunner(interpreter).run();
                            return interpreter.value;

                            //var PluginLoader = require("gtw-pluginloader");
                            //return PluginLoader.runCode(pkg, "executeFunction", [val, args]);
                        };
                    }
                }

                RequestLimiter.queue(function () {
                    $.ajax(out);
                });
            }));
        };

        var getInfoFunc = function (json) {
            var url = "https://plugins.gotowhere.ga/repos/" + json.package + "/info.json";
            return new Promise((resolve, reject) => {
                $.ajax({
                    url: url,
                    dataType: "json",
                    success: function (infoJson) {
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
                url: "https://plugins.gotowhere.ga/repos/" + json.package + "/plugin.js",
                dataType: "text",
                success: function (pluginJs) {
                    try {
                        var cmt = document.createComment("Plugin: " + json.package);
                        document.head.appendChild(cmt);

                        var node = document.createElement("script");
                        node.innerHTML = pluginJs;
                        document.head.appendChild(node);

                        pluginJs = PRE_CODE + pluginJs;
                        
                        var interpreter = new Interpreter(pluginJs, initFunc);

                        exports.plugins[json.package] = {
                            package: json.package,
                            local: localJson,
                            info: json,
                            script: pluginJs,
                            priority: 100,
                            status: 1,
                            interpreter: interpreter,
                            executions: [],
                            msg: "Not enabled"
                        };
                        resolve();
                    } catch (err) {
                        console.error("Error loading " + key + ": " + err);
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

                var interpreter = new Interpreter(PRE_CODE + json.script, initFunc);
                exports.plugins[json.package] = {
                    package: json.package,
                    local: json,
                    info: json.info,
                    script: json.script,
                    priority: 100,
                    status: 1,
                    interpreter: interpreter,
                    executions: [],
                    msg: "Not enabled"
                };
            } else {
                console.error("Error: Unknown plugin method");
            }
        }
        return Misc.allProgress(proms, pc);
    }
});