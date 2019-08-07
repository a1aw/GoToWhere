// OpenETA Plugin Loader

var PluginLoader = function () {

    this.plugins = {};

	this.getLoadedPlugins = function () {
		return this.plugins.length;
	}

	this.decode = function (code) {
		var json = JSON.parse(Base64.decode(code));
		//TODO Compression / encryption stuff
		return json;
	}

    this.install = function (package, checksum) {
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
    }

    this.uninstall = function (package) {
        var localStorage = window.localStorage;
        if (!localStorage) {
            return false;
        }

        localStorage.removeItem(package);
        return true;
    }

    this.getPlugin = function (package) {
        return this.plugins[package];
    }

    this.compareVersion = function (ver0, ver1) {
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

    this.load = function () {
        var json;
        for (var package in this.plugins) {
            json = this.plugins[package];

            if (json.info.dependencies) {
                for (var dependency in json.info.dependencies) {
                    if (!this.plugins[dependency]) {
                        alert("The package \"" + package + "\" requires \"" + dependency + "\" to be installed. You must install it in Plugin Manager in order to enable this plugin.");
                        continue;
                    }

                    if (this.compareVersion(this.plugins[dependency].info.version, json.info.dependencies[dependency]) == -1) {
                        alert("The package \"" + package + "\" requires a newer version of \"" + dependency + "\" to be installed. You must install a new version in Plugin Manager in order to enable this plugin.");
                        continue;
                    }

                    this.plugins[package].priority++;
                    this.plugins[dependency].priority--;
                }
            }
        }

        console.log(this.plugins);

        var loadSeq = [];
        for (var package in this.plugins) {
            loadSeq.push({
                package: package,
                priority: this.plugins[package].priority
            });
        }
        loadSeq.sort(function (a, b) {
            return a.priority - b.priority;
        });
        
        return new Promise(function (resolve, reject) {
            PluginLoader._postLoadSeq(resolve, loadSeq);
        });
    }

    this._postLoadSeq = function (resolve, loadSeq) {
        var seq = loadSeq.shift();

        if (!seq) {
            resolve();
            return;
        }

        var pluginJson = this.plugins[seq.package];
        var json = pluginJson.info;

        var plugin = new window[json.className]();

        if (!(plugin instanceof OpenETAPlugin)) {
            var t = "Error: Main class of \"" + key + "\" is not a child of OpenETAPlugin";
            console.log(t);
            cmt = document.createComment(t);
            document.head.appendChild(cmt);
            return;
        }

        var promise = plugin.onload();

        if (!promise) {
            var t = "Error: \"" + pluginJson.package + "\" reported error for onload() function after promise.";
            pluginJson.status = -1;
            pluginJson.msg = t;

            console.log(t);
            cmt = document.createComment(t);
            alert(t);
            document.head.appendChild(cmt);
            PluginLoader._postLoadSeq(resolve, loadSeq);
        } else if (promise instanceof Promise) {
            promise.then(function (status) {
                pluginJson.status = 0;
                delete pluginJson.msg;
                PluginLoader._postLoadSeq(resolve, loadSeq);
            });
            promise.catch(function (error) {
                var t = "Error: \"" + pluginJson.package + "\" reported error for onload() function after promise.";
                pluginJson.status = -1;
                pluginJson.msg = t;

                console.log(t);
                cmt = document.createComment(t);
                alert(t);
                document.head.appendChild(cmt);
                PluginLoader._postLoadSeq(resolve, loadSeq);
            });
        } else {
            pluginJson.status = 0;
            delete pluginJson.msg;
            PluginLoader._postLoadSeq(resolve, loadSeq);
        }
    }

	this.download = function () {
		var localStorage = window.localStorage;
		if (!localStorage) {
			return false;
        }

        var getInfoFunc = function (args) {
            var json = args[0];
            var url = "https://plugins.openeta.ml/repos/" + json.package + "/info.json";
            $.ajax({
                url: url,
                dataType: "json",
                success: function (infoJson) {
                    console.log(infoJson);
                    getPluginFunc(args[1], json, infoJson);
                },
                error: function () {
                    PluginLoader.plugins[json.package] = {
                        package: json.package,
                        local: json,
                        status: -1,
                        msg: "Could not fetch information from plugins server."
                    };
                    mt.dispatch();
                }
            });
        };

        var getPluginFunc = function (mt, localJson, json) {
            $.ajax({
                url: "https://plugins.openeta.ml/repos/" + json.package + "/plugin.js",
                dataType: "text",
                success: function (pluginJs) {
                    try {
                        var cmt = document.createComment("Plugin: " + json.package);
                        document.head.appendChild(cmt);

                        var node = document.createElement("script");
                        node.innerHTML = pluginJs;
                        document.head.appendChild(node);

                        PluginLoader.plugins[json.package] = {
                            package: json.package,
                            local: localJson,
                            info: json,
                            script: pluginJs,
                            priority: 100,
                            status: 1,
                            msg: "Not enabled"
                        };

                        mt.dispatch();
                    } catch (err) {
                        console.log("Error loading " + key + ": " + err);
                        return false;
                    }
                },
                error: function () {
                    PluginLoader.plugins[json.package] = {
                        package: json.package,
                        local: localJson,
                        info: json,
                        status: -1,
                        msg: "Could not fetch plugin script from plugins server."
                    };
                    mt.dispatch();
                }
            });
        }

        var mt = new MultiTasker();
        var tasks = [];
        var args = [];
        var x = 0;
        for (var i = 0; i < localStorage.length; i++) {
			var key = localStorage.key(i);
			if (!key.startsWith("openeta-plugin-")) {
				continue;
            }
            x++;

            var data = localStorage.getItem(key);

            var json = JSON.parse(data);

            if (!json.package || !json.method || !json.checksum) {
                var t = "Error: \"" + key + "\" is missing a method, package or checksum";
                console.error(t);
                cmt = document.createComment(t);
                document.head.appendChild(cmt);
                continue;
            }

            args.push([json, mt]);
            tasks.push(getInfoFunc);
        }
        mt.setArgs(args);
        mt.setTasks(tasks);
        mt.done(function () {
            var cmt = document.createComment("OpenETA Plugins (" + PluginLoader.plugins.length + " plugin(s) installed)");
            document.head.appendChild(cmt);
        });
        mt.start();
		return mt;
	}
}