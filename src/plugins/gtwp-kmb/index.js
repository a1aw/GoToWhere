//GTW KMB Plugin
define(function (require, exports, module) {
    var Cors = require("gtw-cors");
    var Transit = require("gtw-citydata-transit");
    var TransitRoutes = require("gtw-citydata-transit-routes");
    var TransitStops = require("gtw-citydata-transit-stops");
    var TransitEta = require("gtw-citydata-transit-eta");
    var RequestLimiter = require("gtw-requestlimiter");
    var Lang = require("gtw-lang");

    exports.onload = function(){
        Cors.register("db.kmbeta.ml", true);
        Cors.register("etav3.kmb.hk", false);
        Cors.register("search.kmb.hk", false);

        TransitEta.registerProvider(TransitType.BUS, "KMB", {
            default: "KMB",
            en: "KMB",
            zh: "九巴"
        }, new KmbProvider());
        return true;
    };

    var KmbProvider = function () {
        var global = this;

        this.fetchDatabase = function (resolve, reject) {
            $.ajax({
                url: "https://db.kmbeta.ml/kmbeta_db.json",
                cache: true,
                dataType: "json",
                success: function (db) {
                    resolve(db);
                },
                error: function (err) {
                    reject(err);
                }
            });
        };

        this.isDatabaseUpdateNeeded = function (resolve, reject, versionStr) {
            $.ajax({
                url: "https://db.kmbeta.ml/kmbeta_db-version.json",
                cache: false,
                dataType: "json",
                success: function (data) {
                    var lastUpdated;
                    var version;
                    try {
                        lastUpdated = parseInt(data.version);
                        version = parseInt(versionStr);
                    } catch (err) {
                        console.error("Error: Could not parse kmbeta_db last updated time or cached version! Forcing to be no update");
                        resolve(false);
                    }
                    resolve(lastUpdated > version);
                },
                error: function (err) {
                    console.error("Error: Could not check kmbeta_db update!");
                    //reject(err);
                    resolve(false);
                }
            });
        };

        this.getStopIndex = function (routeId, stopId, selectedPath) {
            var route = this.getRoute(routeId);
            var stop = this.getStop(stopId);
            if (!route || !stop) {
                return -1;
            }

            if (selectedPath < 0 || selectedPath >= route.paths.length) {
                return -1;
            }
            var path = route.paths[selectedPath];
            for (var i = 0; i < path.length; i++) {
                var stopId = path[i];
                if (stop.stopId === stopId) {
                    return i;
                }
            }
            return -1;
        }

        this.fetchEta = function (resolve, reject, opt) {
            var dbRoute = TransitRoutes.getRouteById(opt.routeId);
            var dbStop = TransitStops.getStopById(opt.stopId);
            var refRoute = this.getRouteById(dbRoute.routeName);
            if (!refRoute) {
                console.error("Error: Could not get KMB reference by database route name. Aborting fetch ETA.");
                reject();
                return;
            } else if (refRoute.paths.length !== dbRoute.paths.length || opt.selectedPath >= refRoute.paths.length) {
                console.error("Error: KMB reference database mismatch. Aborting fetch ETA.");
                reject();
                return;
            }

            var dbIndex = Transit.getStopIndex(dbRoute, dbStop, opt.selectedPath);
            var refStopId = refRoute.paths[opt.selectedPath][dbIndex];
            var refStop = this.getStopById(refStopId);

            if (!refStop) {
                console.error("Error: Could not get CTBNWFB reference stop. Aborting fetch ETA.");
                reject();
                return;
            }

            var locale = Lang.getLocale();

            var lang;
            if (locale == "zh") {
                lang = "tc";
            } else {
                lang = "en";
            }

            var url =
                "http://etav3.kmb.hk/" +
                "?action=geteta" +
                "&lang=" + lang +
                "&route=" + refRoute.routeId +
                "&bound=" + (opt.selectedPath + 1) +
                "&stop=" + refStopId +
                "&stop_seq=" + (dbIndex + 1);
            
            RequestLimiter.queue(function () {
                $.ajax({
                    url: url,
                    dataType: "json",
                    cache: false,
                    success: function (data) {
                        var s = [];
                        if (data && data.response) {
                            var srvTime;
                            if (data && data.generated) {
                                //TODO: Fetch from server
                                srvTime = new Date(data.generated);
                            } else {
                                //Fallback to use computer time
                                srvTime = new Date();
                            }

                            var i;
                            for (i = 0; i < data.response.length; i++) {
                                var resp = data.response[i];
                                var sche = {};

                                sche.type = TransitType.BUS;
                                sche.provider = "KMB";

                                sche.isLive = resp.t.toLowerCase().indexOf("scheduled") === -1;
                                sche.isOutdated = false;

                                var hr = parseInt(resp.t.substring(0, 2));
                                var min = parseInt(resp.t.substring(3, 5));

                                var time = new Date(data.updated);
                                time.setHours(hr);
                                time.setMinutes(min);

                                if (hr !== hr || min !== min) {
                                    sche.msg = resp.t;
                                } else {
                                    sche.hasTime = true;
                                    sche.time = time.getTime();
                                }

                                sche.serverTime = srvTime.getTime();

                                sche.features = false;
                                s.push(sche);
                            }
                        }

                        resolve({
                            options: opt,
                            schedules: s
                        });
                    },
                    error: function (err) {
                        reject(opt, err);
                    }
                });
            });
        };
    };
});
