//GTW Database

define(function (require, exports, module) {

    var dbPromise = false;

    exports.open = function () {
        return dbPromise = new Promise((resolve, reject) => {
            if (!('indexedDB' in window)) {
                console.log('This browser doesn\'t support IndexedDB');
                return false;
            }
            var request = indexedDB.open("gotowhere-db", 1);
            request.onupgradeneeded = function (event) {
                var db = event.target.result;
                //Schema v1
                console.log("Creating DB schema");
                if (!db.objectStoreNames.contains("transitRoutes")) {
                    db.createObjectStore("transitRoutes", { keyPath: 'provider' });
                }
                if (!db.objectStoreNames.contains("transitStops")) {
                    db.createObjectStore("transitStops", { keyPath: 'provider' });
                }
                if (!db.objectStoreNames.contains("transitReference")) {
                    db.createObjectStore("transitReference", { keyPath: 'provider' });
                }
                if (!db.objectStoreNames.contains("pluginStorage")) {
                    db.createObjectStore("pluginStorage", { keyPath: 'package' });
                }
            };
            request.onsuccess = function (event) {
                resolve(request.result);
            };
            request.onerror = reject;
        });
    };

    exports.query = function (func) {
        if (typeof func === "function") {
            return dbPromise.then(func);
        }
    };

    exports.putPluginStorage = function (pkg, data) {
        return dbPromise.then(function (db) {
            var tx = db.transaction("pluginStorage", "readwrite");
            var store = tx.objectStore("pluginStorage");
            var clone = Object.assign({}, data);
            store.put({
                package: pkg,
                data: clone
            });
            return tx.complete;
        });
    };

    exports.getPluginStorage = function (pkg) {
        return new Promise((resolve, reject) => {
            dbPromise.then(function (db) {
                var tx = db.transaction("pluginStorage", "readonly");
                var store = tx.objectStore("pluginStorage");
                var request = store.get(pkg);
                request.onsuccess = function () {
                    resolve(request.result ? request.result.data : false);
                };
                request.onerror = reject;
            });
        });
    };

    exports.getTransitRoutesByProvider = function (provider) {
        return new Promise((resolve, reject) => {
            dbPromise.then(function (db) {
                var tx = db.transaction("transitRoutes", "readonly");
                var store = tx.objectStore("transitRoutes");
                var request = store.get(provider);
                request.onsuccess = function () {
                    resolve(request.result);
                };
                request.onerror = reject;
            });
        });
    };

    exports.putTransitRoutes = function (db) {
        const { type, provider, routes, version } = db;
        if (!type || !provider || !routes || !version) {
            console.error("Error: Invalid routes database structure from " + (provider ? provider : "unknown provider") + ".");
            return false;
        }
        for (var route of routes) {
            const { type, provider, routeId, routeName, etaProviders, paths } = route;
            if (!type || !provider || !routeId || !routeName || !etaProviders || !paths || !etaProviders.length || !paths.length) {
                console.error("Error: Invalid database route structure from " + (db.provider ? db.provider : "unknown provider") + ".");
                return false;
            }
        }
        var clone = Object.assign({}, db);
        return dbPromise.then(function (db) {
            var tx = db.transaction("transitRoutes", "readwrite");
            var store = tx.objectStore("transitRoutes");
            store.put(clone);
            return tx.complete;
        });
    };

    exports.getTransitStopsByProvider = function (provider) {
        return new Promise((resolve, reject) => {
            dbPromise.then(function (db) {
                var tx = db.transaction("transitStops", "readonly");
                var store = tx.objectStore("transitStops");
                var request = store.get(provider);
                request.onsuccess = function () {
                    resolve(request.result);
                };
                request.onerror = reject;
            });
        });
    };

    exports.putTransitStops = function (db) {
        const { type, provider, stops, version } = db;
        if (!type || !provider || !stops || !version) {
            console.error("Error: Invalid stops database structure from " + (provider ? provider : "unknown provider") + ".");
            return false;
        }
        for (var stop of stops) {
            const { type, provider, stopId, stopName, addr, lat, lng } = stop;
            if (!type || !provider || !stopId || !stopName || !addr || !lat || !lng || typeof lat !== "number" || typeof lng !== "number") {
                console.error("Error: Invalid database stop structure from " + (db.provider ? db.provider : "unknown provider") + ".");
                return false;
            }
        }
        var clone = Object.assign({}, db);
        return dbPromise.then(function (db) {
            var tx = db.transaction("transitStops", "readwrite");
            var store = tx.objectStore("transitStops");
            store.put(clone);
            return tx.complete;
        });
    };

    exports.getTransitReferenceByProvider = function (provider) {
        return new Promise((resolve, reject) => {
            dbPromise.then(function (db) {
                var tx = db.transaction("transitReference", "readonly");
                var store = tx.objectStore("transitReference");
                var request = store.get(provider);
                request.onsuccess = function () {
                    resolve(request.result);
                };
                request.onerror = reject;
            });
        });
    };

    exports.putTransitReference = function (db) {
        const { type, provider, routes, stops, version } = db;
        if (!type || !provider || !routes || !stops || !version) {
            console.error("Error: Invalid reference database structure from " + (provider ? provider : "unknown provider") + ".");
            return false;
        }
        for (var route of routes) {
            const { type, provider, routeId, routeName, etaProviders, paths } = route;
            if (!type || !provider || !routeId || !routeName || !etaProviders || !paths || !etaProviders.length) { //|| !paths.length) {
                console.error("Error: Invalid reference database route structure from " + (db.provider ? db.provider : "unknown provider") + ".");
                return false;
            }
        }
        for (var stop of stops) {
            const { type, provider, stopId, stopName, addr, lat, lng } = stop;
            if (!type || !provider || !stopId || !stopName || !addr || lat === undefined || lng === undefined || typeof lat !== "number" || typeof lng !== "number") {
                console.error("Error: Invalid reference database stop structure from " + (db.provider ? db.provider : "unknown provider") + ".");
                return false;
            }
        }
        var clone = Object.assign({}, db);
        return dbPromise.then(function (db) {
            var tx = db.transaction("transitReference", "readwrite");
            var store = tx.objectStore("transitReference");
            store.put(clone);
            return tx.complete;
        });
    };
});