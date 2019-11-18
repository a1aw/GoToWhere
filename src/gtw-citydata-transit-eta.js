//City Data: Transit ETA
import * as Misc from './gtw-misc';
import * as Database from './gtw-db';
import { transit_realtime } from 'gtfs-realtime-bindings';

var providers = [];

var cache = {};

export function clearCache() {
    cache = {};
}

export function timeDifference(a, b) {
    var x = a.hr * 60 + a.min;
    var y = b.hr * 60 + b.min;
    return x - y;
}

export function registerProvider(pkg, id, etaProviders, provider) {
    if (!provider.fetchEta || typeof provider.fetchEta !== "function" ||
        !provider.fetchDatabase || typeof provider.fetchDatabase !== "function" ||
        !provider.checkDatabaseUpdate || typeof provider.checkDatabaseUpdate !== "function") {
        throw new Error("Error: " + id + " does not contain fetchEta, fetchDatabase or checkDatabaseUpdate function!");
    }

    provider.pkg = pkg;
    provider.id = id;
    provider.etaProviders = etaProviders;
    provider.db = false;

    if (typeof name === "object") {
        provider["name"] = name["default"];
        for (var key in name) {
            provider["name_" + key] = name[key];
        }
    } else {
        provider.name = name;
    }

    providers.push(provider);
}

export function unregisterProvider(pkg, id) {
    var found = -1;
    for (var i = 0; i < providers.length; i++) {
        if (providers[i].pkg === pkg && providers[i].id === id) {
            found = i;
        }
    }
    providers.splice(found, 1);
}

export function getProviders() {
    return providers;
}

export function getProvider(pkg, id) {
    for (var provider of providers) {
        if (provider.pkg === pkg && provider.id === id) {
            return provider;
        }
    }
    return false;
}

export function getEtaProvider(etaProvider) {
    for (var provider of providers) {
        if (provider.etaProviders.includes(etaProvider)){
            return provider;
        }
    }
    return false;
}

export async function fetchAllDatabase(pc) {
    var db;
    for (var provider of providers) {
        db = await Database.getTransitReference(provider.pkg, provider.id);
        if (!db) {
            continue;
        }
        provider.db = db;
    }

    var needs = {};
    for (var provider of providers) {
        if (provider.db) {
            console.log("has db " + provider.id);
            try {
                var needed = await new Promise((resolve, reject) => {
                    provider.checkDatabaseUpdate(resolve, reject, provider.db.version);
                });
                console.log("update: " + provider.id + " " + needed);
                needs[provider.id] = needed;
            } catch (err) {
                console.error("Error: Database check update for " + provider.id + " failed!");
                needs[provider.id] = false;
            }
        } else {
            console.log("No db found for " + provider.id);
            needs[provider.id] = true;
        }
    }
    console.log(needs);
    for (var provider of providers) {
        if (needs[provider.id]) {
            try {
                var data = await new Promise((resolve, reject) => {
                    provider.fetchDatabase(resolve, reject);
                });
                if (!data["package"] || !data["provider"] || !data.version) {
                    console.error("Error: Returned reference database is missing version, package or provider parameter(s) for " + (data.provider ? data.provider : "unknown provider") + ".");
                    return;
                }
                provider.db = data;
                await Database.putTransitReference(data);
            } catch (err) {
                console.error("Error: Database fetch for " + provider.id + " failed!");
            }
        }
    }
}

export function fetchEta(opt) {
    if (!opt.agency || !opt.route || !opt.trip || !opt.stopTimes || !opt.stop) {
        console.error("Error: Fetch ETA missing agency, route, trip or stop parameter.");
        return false;
    }
    return new Promise((resolve, reject) => {
        var proms = [];
        var count = 0;
        for (var providerId of opt.etaProviders) {
            proms.push(new Promise((resolve, reject) => {
                var provider = getEtaProvider(providerId);

                if (!provider) {
                    resolve();
                    console.log("Could not find registered Transit ETA provider with name \"" + providerId + "\"");
                    return;
                }

                count++;

                var key = providerId + "-" + opt.route["route_id"] + "-" + opt.trip["trip_id"] + "-" + opt.stop["stop_id"];
                var cached = cache[key];
                var now = new Date();

                if (cached && (now - cached.lastFetched) > 30000) {
                    cached = false;
                    delete cache[key];
                }

                if (!cached) {
                    var global = this;
                    var p = new Promise((resolve, reject) => {
                        provider.fetchEta(resolve, reject, opt);
                    });
                    p.then(function (feed) {
                        var obj = transit_realtime.FeedMessage.fromObject(feed);
                        var result = transit_realtime.FeedMessage.verify(obj);
                        if (result !== null) {
                            console.error("Error: Returned feed is invalid: " + result);
                            return;
                        }

                        var time = new Date();

                        cache[key] = {
                            lastFetched: time.getTime(),
                            feed: obj
                        };

                        resolve(obj);
                    }).catch(function (err) {
                        reject(opt, err);
                    });
                } else {
                    resolve(cached.feed);
                }
            }));
        }
        Promise.all(proms).then(function (feeds) {
            if (count > 0) {
                var out = [];
                for (var feed of feeds) {
                    if (feed && feed.header && feed.entity) {
                        out.push(feed);
                    }
                }
                resolve({
                    feeds: out,
                    options: opt,
                    code: 0
                })
            } else if (opt.etaProviders && opt.etaProviders.length > 0) {
                resolve({
                    code: -2,
                    options: opt
                });
            } else {
                resolve({
                    code: -1,
                    options: opt
                });
            }
        }).catch(reject);
    });
}

export function getCache() {
    return cache;
}