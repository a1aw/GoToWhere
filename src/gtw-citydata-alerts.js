//GTW Alerts Manager

define('gtw-citydata-alerts', function (require, exports, module) {

    exports.providers = [];

    var AlertsProvider = function (packageName, providerObjName, name) {
        this.packageName = packageName;
        this.providerObjName = providerObjName;
        this.name = name;
        this.cached = false;
        this.lastFetched = 0;

        this.fetchAlerts = function () {
            var global = this;
            return new Promise((resolve, reject) => {
                var now = new Date();
                if (cached && (now - lastFetched) > 15000) {
                    cached = false;
                }

                if (!cached) {
                    var p = new Promise((resolve, reject) => {
                        PluginLoader.runCode(this.packageName, this.providerObjName + ".fetchAlerts", resolve, reject);
                    });
                    p.then(function (alertsObj) {
                        const { alerts } = alertsObj;

                        if (!alerts || !alerts.length) {
                            console.error("Error: Plugin provided a Alerts object with invalid structure.");
                            reject();
                            return;
                        }

                        var out = {
                            alerts: alerts
                        };

                        global.cached = out;
                        global.lastFetched = new Date().getTime();

                        resolve(out);
                    }).catch(function (err) {
                        reject(err);
                    });
                } else {
                    resolve(cached);
                }
            });
        };
    };

    exports.registerProvider = function (packageName, providerObjName, name) {
        exports.providers.push(new AlertsProvider(packageName, providerObjName, name));
    }

    exports.unregisterProvider = function (name) {
        var found = -1;
        for (var i = 0; i < exports.providers.length; i++) {
            if (exports.providers[i].name === name) {
                found = i;
            }
        }
        exports.providers.splice(found, 1);
    }

    exports.getProviders = function () {
        return exports.providers;
    }

    exports.getProvider = function (providerName) {
        for (var provider of exports.providers) {
            if (provider.name === providerName) {
                return provider;
            }
        }
        return false;
    };

    exports.fetchEta = function (handler) {
        var provider = exports.getProvider(handler.provider);

        if (!provider) {
            throw new Error("Could not find registered ETA provider with name \"" + handler.provider + "\"");
        }

        return provider.fetchEta(handler);
    }

});