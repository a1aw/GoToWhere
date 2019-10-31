//GTWP HK Transit Plugin
define(function (require, exports, module) {
    var Cors = require("gtw-cors");
    var Database = require("gtw-db");
    var Transit = require("gtw-citydata-transit");
    var TransitRoutes = require("gtw-citydata-transit-routes");
    var TransitStops = require("gtw-citydata-transit-stops");

    function parseIsoDatetime(dtstr) {
        var dt = dtstr.split(/[: T-]/).map(parseFloat);
        return new Date(dt[0], dt[1] - 1, dt[2], dt[3] || 0, dt[4] || 0, dt[5] || 0, 0);
    }

    exports.onload = function () {
        Cors.register("db.kmbeta.ml", true);
        Cors.register("rt.data.gov.hk", true);
        return new Promise((resolve, reject) => {
            Database.getPluginStorage("gtwp-hktransit").then(function (data) {
                return new Promise((resolve, reject) => {
                    if (data) {
                        resolve(data.companies);
                        return;
                    }
                    $.ajax({
                        url: "https://db.kmbeta.ml/hktransit_companies.json",
                        cache: false,
                        dataType: "json",
                        success: function (json) {
                            Database.putPluginStorage("gtwp-hktransit", json).then(function () {
                                resolve(json.companies);
                            }).catch(reject);
                        },
                        error: function () {
                            reject();
                        }
                    });
                });
            }).then(function (companies) {
                for (var company of companies) {
                    var transitType;
                    switch (company.id) {
                        case "FERRY":
                            transitType = "ferry";
                            break;
                        case "GMB":
                            transitType = "minibus";
                            break;
                        case "PTRAM":
                        case "TRAM":
                            transitType = "tram";
                            break;
                        default:
                            transitType = "bus";
                    }
                    TransitRoutes.registerProvider(transitType, company.id, company.name, new HkTransitRoutesProvider());
                    TransitStops.registerProvider(transitType, company.id, company.name, new HkTransitStopsProvider());
                }
                resolve(true);
            }).catch(reject);
        });
    };

    var HkTransitRoutesProvider = function () {
        var global = this;

        this.fetchDatabase = function (resolve, reject) {
            $.ajax({
                url: "https://db.kmbeta.ml/hktransit_" + global.id + "-routes.json",
                cache: false,
                dataType: "json",
                success: function (db) {
                    resolve(db);
                },
                error: function () {
                    console.error("Error: Could not fetch " + global.id + " routes database!");
                    resolve(false);
                }
            });
        };

        this.isDatabaseUpdateNeeded = function (resolve, reject, versionStr) {
            $.ajax({
                url: "https://db.kmbeta.ml/hktransit_" + global.id + "-version.json",
                cache: false,
                dataType: "json",
                success: function (data) {
                    var lastUpdated;
                    var version;
                    try {
                        lastUpdated = parseInt(data.version);
                        version = parseInt(versionStr);
                    } catch (err) {
                        console.error("Error: Could not parse hktransit_" + global.id + " routes last updated time or cached version! Forcing to be no update");
                        resolve(false);
                    }
                    resolve(lastUpdated > version);
                },
                error: function (err) {
                    console.error("Error: Could not check hktransit_" + global.id + " routes update!");
                    //reject(err);
                    resolve(false);
                }
            });
            resolve(true);
        };
    };

    var HkTransitStopsProvider = function () {
        var global = this;

        this.fetchDatabase = function (resolve, reject) {
            $.ajax({
                url: "https://db.kmbeta.ml/hktransit_" + global.id + ".json",
                cache: false,
                dataType: "json",
                success: function (db) {
                    resolve(db);
                },
                error: function () {
                    console.error("Error: Could not fetch " + global.id + " stops database!");
                    resolve(false);
                }
            });
        };

        this.isDatabaseUpdateNeeded = function (resolve, reject, versionStr) {
            $.ajax({
                url: "https://db.kmbeta.ml/hktransit_" + global.id + "-version.json",
                cache: false,
                dataType: "json",
                success: function (data) {
                    var lastUpdated;
                    var version;
                    try {
                        lastUpdated = parseInt(data.version);
                        version = parseInt(versionStr);
                    } catch (err) {
                        console.error("Error: Could not parse hktransit_" + global.id + " stops last updated time or cached version! Forcing to be no update");
                        resolve(false);
                    }
                    resolve(lastUpdated > version);
                },
                error: function (err) {
                    console.error("Error: Could not check hktransit_" + global.id + " stops update!");
                    //reject(err);
                    resolve(false);
                }
            });
            resolve(true);
        };
    };

});