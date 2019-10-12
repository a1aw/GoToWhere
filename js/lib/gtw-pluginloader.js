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
        for (var package in exports.plugins) {
            json = exports.plugins[package];

            if (json.status <= 0) {
                continue;
            }

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
                }
            }

            p = new Promise((resolve, reject) => {
                console.log("Loading" + package);
                requirejs([package], function (mod) {
                    console.log("Loaded" + package);
                    if (!mod) {
                        var msg = "Error: No module returned from " + package + "!";
                        console.error(msg);
                        exports.plugins[package].status = -3;
                        exports.plugins[package].msg = msg;
                    } else if (!mod.onload || typeof mod.onload != "function") {
                        var msg = "Error: " + package + " does not contain onload function!";
                        console.error(msg);
                        exports.plugins[package].status = -4;
                        exports.plugins[package].msg = msg;
                    } else {
                        var status = mod.onload();
                        if (status) {
                            exports.plugins[package].status = 0;
                            delete exports.plugins[package].msg;
                        } else {
                            var msg = "Error: " + package + " returned error on onload function!";
                            console.error(msg);
                            exports.plugins[package].status = -5;
                            exports.plugins[package].msg = msg;
                        }
                    }
                    resolve();
                }, function (err) {
                    console.log("Err" + err);
                    exports.plugins[package].status = -2;
                    exports.plugins[package].msg = err;
                    reject(err);
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
        var json;
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
            json = JSON.parse(data);

            if (!json.package || !json.method || !json.checksum || !json.version) {
                var t = "Error: \"" + key + "\" is missing a method, package, version or checksum";
                console.error(t);
                cmt = document.createComment(t);
                document.head.appendChild(cmt);
                continue;
            }

            if (json.method == "online") {
                p = new Promise((resolve, reject) => {
                    var url = "https://plugins.gotowhere.ga/repos/" + json.package + "/info.json";
                    $.ajax({
                        url: url,
                        dataType: "json",
                        success: function (infoJson) {
                            $.ajax({
                                url: "https://plugins.gotowhere.ga/repos/" + infoJson.package + "/plugin.js",
                                dataType: "text",
                                success: function (script) {
                                    var sha1 = CryptoJS.SHA1(script);

                                    if (sha1 != infoJson.checksum) {
                                        var msg = "Error: Downloaded and online checksum mismatch detected for " + json.package + ". Online: " + infoJson.checksum + " Calculated: " + sha1 + ". There might be a man-in-the-middle attack running behind or CDN cache are not clean. Please wait a moment and try again later. If this persists, report it to the GitHub issue tracker.";
                                        console.error(msg);
                                        alert(msg);
                                        exports.plugins[infoJson.package] = {
                                            package: json.package,
                                            local: json,
                                            info: infoJson,
                                            status: -6,
                                            msg: msg
                                        };
                                        resolve();
                                        return;
                                    }

                                    if (sha1 != json.checksum) {
                                        console.warn("Warning: Local and calculated checksum mismatch detected for " + json.package + ". Local: " + json.checksum + " Calculated: " + sha1);
                                        if (json.version != infoJson.version) {
                                            console.warn("Warning: Installing online version of the plugin \"" + json.package + "\" and replace checksums");
                                            exports.install(infoJson.package, infoJson.checksum, infoJson.version);
                                        } else {
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
                                        msg: "Not enabled"
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
                                msg: "Could not fetch information from plugins server."
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
                    msg: "Not enabled"
                };
            } else {
                console.error("Error: Unknown plugin method \"" + json.method + "\" for " + json.package + ".");
            }

            
        }
        return Misc.allProgress(proms, pc);
    }
});