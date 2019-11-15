//GTW Database

export var dbPromise = false;

export function open() {
    return dbPromise = new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) {
            console.log('This browser doesn\'t support IndexedDB');
            return false;
        }
        var request = indexedDB.open("gotowhere-db", 2);
        request.onupgradeneeded = function (event) {
            var db = event.target.result;
            //Schema v2
            console.log("Creating/Updating DB schema");
            var store;
            switch (event.oldVersion) {
                case 0:
                    db.createObjectStore("pluginStorage", { keyPath: 'package' });
                    db.createObjectStore("transitReference", { keyPath: 'provider' });
                case 1:
                    if (db.objectStoreNames.contains("transitStops")) {
                        db.deleteObjectStore("transitStops");
                    }
                    if (db.objectStoreNames.contains("transitRoutes")) {
                        db.deleteObjectStore("transitRoutes");
                    }
                    /*
                    db.createObjectStore("gtfs_versions", { keyPath: ['package', 'provider'] });

                    db.createObjectStore("gtfs_fare_rules", { keyPath: ['package', 'provider', 'fare_id'] });

                    db.createObjectStore("gtfs_fare_attributes", { keyPath: ['package', 'provider', 'fare_id'] });

                    db.createObjectStore("gtfs_stops", { keyPath: ['provider', 'stop_id'] });

                    store = db.createObjectStore("gtfs_stop_times", { keyPath: ['package', 'provider'] });
                    store.createIndex("stop_id", "stop_id");

                    db.createObjectStore("gtfs_routes", { keyPath: ['package', 'provider', 'route_id'] });

                    db.createObjectStore("gtfs_trips", { keyPath: ['package', 'provider', 'trip_id'] });

                    db.createObjectStore("gtfs_calendar", { keyPath: ['package', 'provider', 'service_id'] });

                    db.createObjectStore("gtfs_agency", { keyPath: ['package', 'provider', 'agency_id'] });

                    db.createObjectStore("gtfs_frequencies", { keyPath: ['package', 'provider', 'trip_id'] });

                    db.createObjectStore("gtfs_calendar_dates", { keyPath: ['package', 'provider', 'service_id', 'date'] });
                    */
            }
        };
        request.onsuccess = function (event) {
            resolve(request.result);
        };
        request.onerror = reject;
    });
};

export function query(func) {
    if (typeof func === "function") {
        return dbPromise.then(func);
    }
};

export function putPluginStorage(pkg, data) {
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

export function getPluginStorage(pkg) {
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
}

export function getTransitReferenceByProvider(providerName) {
    return new Promise((resolve, reject) => {
        dbPromise.then(function (db) {
            var tx = db.transaction("transitReference", "readonly");
            var store = tx.objectStore("transitReference");
            var request = store.get(providerName);
            request.onsuccess = function () {
                resolve(request.result);
            };
            request.onerror = reject;
        });
    });
}

export function putTransitReference(db) {
    if (db.package === undefined || db.provider === underfined || db.version === undefined) {
        console.error("Error: Database does not contain a package name, a provider name or a version! Aborting to add this database.");
        return false;
    }
    var clone = Object.assign({}, db);
    return dbPromise.then(function (db) {
        var tx = db.transaction("transitReference", "readwrite");
        var store = tx.objectStore("transitReference");
        store.put(clone);
        return tx.complete;
    });
}