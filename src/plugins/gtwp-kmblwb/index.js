//GTWP KMBLWB ETA Plugin

import * as TransitEta from '../../gtw-citydata-transit-eta';
import * as Cors from '../../gtw-cors';
import * as gtfs from '../../gtw-citydata-transit-gtfs';
import * as Lang from '../../gtw-lang';
import * as RequestLimiter from '../../gtw-requestlimiter';

export function onload() {
    Cors.register("db.kmbeta.ml", true);
    Cors.register("etav3.kmb.hk", false);
    TransitEta.registerProvider("gtwp-kmblwb", "kmblwb", ["KMB", "LWB"], new KmbLwbEtaProvider());
    return true;
}

function parseIsoDatetime(dtstr) {
    var dt = dtstr.split(/[: T-]/).map(parseFloat);
    return new Date(dt[0], dt[1] - 1, dt[2], dt[3] || 0, dt[4] || 0, dt[5] || 0, 0);
}

var KmbLwbEtaProvider = function () {

    this.checkDatabaseUpdate = function (resolve, reject, localVer) {
        $.ajax({
            url: "https://db.kmbeta.ml/kmbeta_db-version.json",
            cache: false,
            dataType: "json",
            success: function (data) {
                var lastUpdatedInt;
                var localVerInt;
                try {
                    lastUpdatedInt = parseInt(data.version);
                    localVerInt = parseInt(localVer);
                } catch (err) {
                    console.error("Error: Could not parse kmbeta_db last updated time or cached version! Forcing to be no update");
                    resolve(false);
                }
                resolve(lastUpdatedInt > localVerInt);
            },
            error: function (err) {
                console.error("Error: Could not check kmbeta_db update!");
                resolve(false);
            }
        });
    };

    this.fetchEta = function (resolve, reject, options) {
        console.log(options);
        var agencyId = options.agency["agency_id"];
        var multi = false;
        if (agencyId.includes("+")) {
            multi = true;
            var splits = agencyId.split("+");
            for (var split of splits) {
                if (split === "KMB" || split === "LWB") {
                    agencyId = split;
                    break;
                }
            }
        }

        if (agencyId !== "KMB" && agencyId !== "LWB") {
            console.error("Error: Cannot request ETA from companies that are not KMB and LWB! Requested: " + agencyId);
            reject();
            return;
        }

        gtfs.getAgency("gtwp-hktransit", "hktransit", agencyId).then(etaAgency => {
            var localizedAgencyName = Lang.localizedKey(etaAgency, "agency_short_name");

            var tripIdSplits = options.trip["trip_id"].split("-");
            var bound = parseInt(tripIdSplits[1]);
            var routeName = options.route["route_short_name"];

            var refRoute = false;
            for (var route of this.db.routes) {
                if (route.routeId === routeName) {
                    refRoute = route;
                    break;
                }
            }

            if (!refRoute) {
                console.error("Error: Could not find KMBLWB reference route using " + routeName);
                reject();
                return;
            }

            if (refRoute.paths[bound - 1].length !== options.stopTimes.length) {
                console.error("Error: KMBLWB reference route path mismatch with stop times.");
                reject();
                return;
            }

            var stopIndex = -1;
            var i;
            for (i = 0; i < options.stopTimes.length; i++) {
                if (options.stopTimes[i]["stop_id"] === options.stop["stop_id"]) {
                    stopIndex = i;
                    break;
                }
            }

            if (stopIndex === -1) {
                console.error("Error: Could not find KMBLWB stop index in stop times!");
                reject();
                return;
            }

            var refStopId = refRoute.paths[bound - 1][stopIndex];

            var locale = Lang.getLocale();

            var lang;
            if (locale === "zh") {
                lang = "tc";
            } else {
                lang = "en";
            }

            var url =
                "http://etav3.kmb.hk/" +
                "?action=geteta" +
                "&lang=" + lang +
                "&route=" + routeName +
                "&bound=" + bound +
                "&stop=" + refStopId +
                "&stop_seq=" + (stopIndex + 1);
            
            $.ajax({
                url: url,
                method: "GET",
                dataType: "json",
                cache: false,
                success: function (resp) {
                    var entities = [];

                    var updates = [];
                    var alerts = [];

                    //TODO get start_time and start_date from gtfs db
                    var tripDesc = {
                        "tripId": options.trip["trip_id"],
                        "startTime": "00:00:00",
                        "startDate": "20190101"
                    };

                    var timestamp = new Date(resp.generated);

                    var sches = resp.response;
                    if (sches && sches.length > 0) {
                        var i;
                        var etaTime;
                        var sche;
                        for (i = 0; i < sches.length; i++) {
                            sche = sches[i];

                            etaTime = false;
                            var text = sche.t.toLowerCase();

                            if (text.length >= 5) {
                                var hr = parseInt(text.substring(0, 2));
                                var min = parseInt(text.substring(3, 5));
                                if (!isNaN(hr) && !isNaN(min)) {
                                    etaTime = new Date(resp.updated);
                                    etaTime.setHours(hr);
                                    etaTime.setMinutes(min);
                                }
                            }

                            if (etaTime) {
                                updates.push({
                                    "stopId": options.stop["stop_id"],
                                    "arrival": {
                                        time: etaTime.getTime()
                                    }
                                });
                            } else if (text.length > 0) {
                                var langCode;
                                if (lang === "tc") {
                                    langCode = "zh-HK";
                                } else {
                                    langCode = "en";
                                }

                                var alertText = "";
                                if (multi) {
                                    alertText += localizedAgencyName + ": ";
                                }
                                alertText += sche.t;

                                var transText = [{
                                    text: alertText,
                                    language: langCode
                                }];
                                alerts.push({
                                    "informedEntity": [
                                        {
                                            trip: tripDesc,
                                            "stop_id": options.stop["stop_id"]
                                        }
                                    ],
                                    "headerText": {
                                        translation: transText
                                    },
                                    "descriptionText": {
                                        translation: transText
                                    }
                                });
                            }
                        }
                    }

                    var time = Date.now();
                    if (updates.length > 0) {
                        var vehicleDesc = {
                            label: localizedAgencyName
                        };
                        var entityId = options.agency["agency_id"] + "-" + options.stop["stop_id"] + "-" + options.route["route_short_name"] + "-trip-update-" + time;
                        var entity = {
                            id: entityId,
                            "tripUpdate": {
                                trip: tripDesc,
                                timestamp: timestamp,
                                "stopTimeUpdate": updates
                            }
                        };
                        if (multi) {
                            entity.vehicle = {
                                vehicle: vehicleDesc
                            };
                        }
                        entities.push(entity);
                    }

                    if (alerts.length > 0) {
                        var i;
                        for (i = 0; i < alerts.length; i++) {
                            var entityId = options.agency["agency_id"] + "-" + options.stop["stop_id"] + "-" + options.route["route_short_name"] + "-alert-" + i + "-" + time;
                            var entity = {
                                id: entityId,
                                "alert": alerts[i]
                            };
                            entities.push(entity);
                        }
                    }

                    var feed = {
                        header: {
                            "gtfsRealtimeVersion": "2.0",
                            incrementality: "FULL_DATASET",
                            timestamp: time
                        },
                        entity: entities
                    };

                    resolve(feed);
                },
                error: function (err0, err1, err2) {
                    reject();
                }
            });
        });
    };

    this.fetchDatabase = function (resolve, reject) {
        $.ajax({
            url: "https://db.kmbeta.ml/kmbeta_db.json",
            cache: false,
            dataType: "json",
            success: function (data) {
                if (!data.routes || !data.stops || !data.version) {
                    console.error("Error: KMBLWB downloaded database is in wrong structure! Report to GitHub for this problem!");
                    return;
                }
                data["package"] = "gtwp-kmblwb";
                data["provider"] = "kmblwb";
                resolve(data);
            },
            error: function (err, err1, err2) {
                reject();
            }
        });
    };
};