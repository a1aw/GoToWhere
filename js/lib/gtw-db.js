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
                console.log(db);
                if (!db.objectStoreNames.contains("transitDb")) {
                    db.createObjectStore("transitDb", { keyPath: 'provider' });
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

    exports.getTransitDatabaseByProvider = function (provider) {
        return dbPromise.then(function (db) {
            var tx = db.transaction("transitDb", "readonly");
            var store = tx.objectStore("transitDb");
            return store.get(provider);
        });
    };

    exports.getAllTransitDatabases = function () {
        return new Promise((resolve, reject) => {
            var routes = [];
            var stops = [];
            dbPromise.then(function (db) {
                var tx = db.transaction("transitDb", "readonly");
                var store = tx.objectStore("transitDb");
                return store.openCursor();
            }).then(function iterate(cursor) {
                if (!cursor) {
                    return;
                }
                routes.push(cursor.value["routes"]);
                stops.push(cursor.value["stops"]);
                return cursor.continue().then(iterate);
            }).then(function () {
                resolve({
                    routes: routes,
                    stops: stops
                });
            }).catch(reject);
        });
    };

    exports.putTransitDatabase = function (db) {
        const { transit, provider, routes, stops, version } = db;
        if (!transit || !provider || !routes || !stops || !version) {
            console.error("Error: Invalid database structure from " + (db.provider ? db.provider : "unknown provider") + ".");
            return false;
        }
        for (var route of routes) {
            const { transit, provider, routeId, paths } = route;
            if (!transit || !provider || !routeId || !paths) {
                console.error("Error: Invalid database route structure from " + (db.provider ? db.provider : "unknown provider") + ".");
                return false;
            }
        }
        for (var stop of stops) {
            const { transit, provider, stopId, stopName, addr, lat, lng } = stop;
            if (!transit || !provider || !stopId || !stopName || !addr || !lat || !lng || typeof lat !== "number" || typeof lng !== "number") {
                console.error("Error: Invalid database stop structure from " + (db.provider ? db.provider : "unknown provider") + ".");
                return false;
            }
        }
        var clone = Object.assign({}, db);
        return dbPromise.then(function (db) {
            var tx = db.transaction("transitDb", "readwrite");
            var store = tx.objectStore("transitDb");
            store.put(clone);
            return tx.complete;
        });
    };

});