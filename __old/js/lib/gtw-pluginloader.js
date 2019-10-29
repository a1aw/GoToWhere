// GTW Plugin Loader

define(function (require, exports, module) {
    var CryptoJS = require("crypto-js");
    var Misc = require("gtw-misc");

    exports.plugins = {};

    exports.getLoadedPlugins = function () {
        return exports.plugins.length;
    }

    exports.install = function (package, checksum, version) {
        var localStorage = window.localStorage;
        if (!localStorage) {
            return false;
        }

        var json = {};
        json.method = "online";
        json.version = version;
        json.checksum = checksum;
        json.package = package;
        localStorage.setItem(package, JSON.stringify(json));
        return true;
    }

    exports.uninstall = function (package) {
        var localStorage = window.localStorage;
        if (!localStorage) {
            return false;
        }

        localStorage.removeItem(package);
        return true;
    }

    exports.getPlugin = function (package) {
        return exports.plugins[package];
    }

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
    }

    exports.load = function (pc) {
        var json;
        var p;
        var proms = [];
        for (const pkg in exports.plugins) {
            json = exports.plugins[pkg];

            if (json.status <= 0) {
                continue;
            }

            if (json.info.dependencies) {
                for (var dependency in json.info.dependencies) {
                    if (!exports.plugins[dependency]) {
                        exports.plugins[pkg].status = -6;
                        exports.plugins[pkg].msg = $.i18n("plugin-error-dependency-not-installed", pkg, dependency);
                        continue;
                    }

                    if (exports.compareVersion(exports.plugins[dependency].info.version, json.info.dependencies[dependency]) == -1) {
                        alert();
                        exports.plugins[pkg].status = -6;
                        exports.plugins[pkg].msg = $.i18n("plugin-error-dependency-version-too-old", pkg, dependency);
                        continue;
                    }
                }
            }

            p = new Promise((resolve, reject) => {
                console.log("Loading" + pkg);
                requirejs([pkg], function (mod) {
                    console.log("Loaded" + pkg);
                    if (!mod) {
                        var msg = $.i18n("plugin-error-no-module-returned", pkg);
                        console.error(msg);
                        exports.plugins[pkg].status = -3;
                        exports.plugins[pkg].msg = msg;
                    } else if (!mod.onload || typeof mod.onload != "function") {
                        var msg = $.i18n("plugin-error-no-onload-function", pkg);
                        console.error(msg);
                        exports.plugins[pkg].status = -4;
                        exports.plugins[pkg].msg = msg;
                    } else {
                        var promise = new Promise((resolve, reject) => {
                            var status = mod.onload();
                            if (status instanceof Promise) {
                                status.then(resolve).catch(reject);
                            } else {
                                resolve(status);
                            }
                        });
                        promise.then(function (status) {
                            if (status) {
                                exports.plugins[pkg].status = 0;
                                delete exports.plugins[pkg].msg;
                            } else {
                                var msg = $.i18n("plugin-error-onload-function-error", pkg);
                                console.error(msg);
                                exports.plugins[pkg].status = -5;
                                exports.plugins[pkg].msg = msg;
                            }
                            resolve();
                        }).catch(reject);
                    }
                }, function (err) {
                    exports.plugins[pkg].status = -2;
                    exports.plugins[pkg].msg = err;
                    resolve(err);
                });
            });
            proms.push(p);
        }
        return Misc.allProgress(proms, pc);
    }

    exports.download = function (pc) {
        var localStorage = window.localStorage;
        if (!localStorage) {
            return false;
        }

        var data;
        //var json;
        var key;
        var i;
        var count = 0;
        var p;
        var proms = [];
        for (i = 0; i < localStorage.length; i++) {
            key = localStorage.key(i);
            if (!key.startsWith("gtwp-")) {
                continue;
            }
            count++;

            data = localStorage.getItem(key);
            const json = JSON.parse(data);

            if (!json.package || !json.method || !json.checksum || !json.version) {
                var msg = $.i18n("plugin-error-json-missing-parameters", key);
                exports.plugins[key] = {
                    package: key,
                    local: json,
                    status: -7,
                    msg: msg
                };
                continue;
            }

            if (json.method == "online") {
                p = new Promise((resolve, reject) => {
                    var url = "https://plugins.gotowhere.ga/repos/" + json.package + "/info.json";
                    $.ajax({
                        url: url,
                        dataType: "json",
                        cache: false,
                        success: function (_infoJson) {
                            const infoJson = _infoJson;
                            $.ajax({
                                url: "https://plugins.gotowhere.ga/repos/" + infoJson.package + "/plugin.js",
                                dataType: "text",
                                cache: false,
                                success: function (script) {
                                    var sha1 = CryptoJS.SHA1(script);

                                    if (sha1 != infoJson.checksum) {
                                        var msg =  $.i18n("plugin-error-download-online-checksum-mismatch", json.package, infoJson.checksum, sha1);
                                        console.error(msg);
                                        //alert(msg);
                                        exports.plugins[infoJson.package] = {
                                            package: json.package,
                                            local: json,
                                            info: infoJson,
                                            status: -8,
                                            msg: msg
                                        };
                                        resolve();
                                        return;
                                    }

                                    if (sha1 != json.checksum || json.version != infoJson.version) {
                                        console.warn("Warning: Local and calculated checksum mismatch detected for " + json.package + ". Local: " + json.checksum + " Calculated: " + sha1);
                                        if (json.version != infoJson.version) {
                                            console.warn("Warning: Installing online version of the plugin \"" + json.package + "\" and replace checksums");
                                            exports.install(infoJson.package, infoJson.checksum, infoJson.version);
                                        } else {
                                            /*
                                            if (confirm("Warning: Local and calculated checksum mismatch detected for the same version of plugin \"" + json.package + "\". It might be only the repository not clean, or a man-in-the-middle attack is running behind. Do you want to continue to use the online version instead? Or, it will be skipped from loading.")) {
                                                exports.install(infoJson.package, infoJson.checksum, infoJson.version);
                                            } else {
                                                exports.plugins[infoJson.package] = {
                                                    package: json.package,
                                                    local: json,
                                                    info: infoJson,
                                                    status: -7,
                                                    msg: "Warning: Local and calculated checksum mismatch detected for the same version of plugin \"" + json.package + ". You can fix it by accepting the online checksum in startup."
                                                };
                                                resolve();
                                                return;
                                            }
                                            */
                                            exports.plugins[infoJson.package] = {
                                                package: json.package,
                                                local: json,
                                                info: infoJson,
                                                status: -8,
                                                msg: $.i18n("plugin-error-local-calculated-checksum-mismatch", infoJson.package)
                                            };
                                            resolve();
                                            return;
                                        }
                                    }

                                    var blob = new Blob([script], { type: "text/javascript" });

                                    console.log(infoJson);
                                    var paths = {};
                                    paths[infoJson.package] = URL.createObjectURL(blob);
                                    console.log(paths);
                                    requirejs.config({
                                        paths: paths
                                    });
                                    exports.plugins[infoJson.package] = {
                                        package: json.package,
                                        local: json,
                                        info: infoJson,
                                        status: 1,
                                        msg: $.i18n("plugin-status-not-enabled")
                                    };
                                    resolve();
                                },
                                error: function (err) {
                                    reject(err);
                                }
                            });
                        },
                        error: function () {
                            exports.plugins[json.package] = {
                                package: json.package,
                                local: json,
                                status: -1,
                                msg: $.i18n("plugin-error-could-not-fetch-info")
                            };
                            reject();
                        }
                    });
                });
                proms.push(p);
            } else if (json.method == "local") {
                var loc = json.location;
                if (!loc.startsWith("file:")) {
                    console.error("Error: Local development plugin for \"" + json.package + "\" must start with \"file:\".");
                    continue;
                }
                if (window.location.origin.startsWith("http")) {
                    localStorage.removeItem(json.package);
                    console.error("Error: Local development plugin for \"" + json.package + "\" can only be used in local.");
                    continue;
                }
                var infoJson = {
                    dependencies: {},
                    version: json.version
                };
                var paths = {};
                paths[json.package] = loc;
                console.log(paths);
                requirejs.config({
                    paths: paths
                });
                exports.plugins[json.package] = {
                    package: json.package,
                    local: json,
                    info: infoJson,
                    status: 1,
                    msg: $.i18n("plugin-status-not-enabled")
                };
            } else {
                console.error("Error: Unknown plugin method \"" + json.method + "\" for " + json.package + ".");
            }

            
        }
        return Misc.allProgress(proms, pc);
    }
});