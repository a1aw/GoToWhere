//GTWP CTBNWFB ETA Plugin

import * as TransitEta from '../../gtw-citydata-transit-eta';
import * as Cors from '../../gtw-cors';
import * as gtfs from '../../gtw-citydata-transit-gtfs';
import * as Lang from '../../gtw-lang';

export function onload() {
    Cors.register("db.hktransit.ml", true);
    Cors.register("rt.data.gov.hk", true);
    TransitEta.registerProvider("gtwp-ctbnwfb", "ctbnwfb", ["CTB", "NWFB"], new CtbNwfbEtaProvider());
    return true;
}

function parseIsoDatetime(dtstr) {
    var dt = dtstr.split(/[: T-]/).map(parseFloat);
    return new Date(dt[0], dt[1] - 1, dt[2], dt[3] || 0, dt[4] || 0, dt[5] || 0, 0);
}

var CtbNwfbEtaProvider = function () {

    this.checkDatabaseUpdate = function (resolve, reject, localVer) {
        $.ajax({
            url: "https://db.hktransit.ml/ctbnwfb_db-version.json",
            cache: false,
            dataType: "json",
            success: function (data) {
                var lastUpdatedInt;
                var localVerInt;
                try {
                    lastUpdatedInt = parseInt(data.version);
                    localVerInt = parseInt(localVer);
                } catch (err) {
                    console.error("Error: Could not parse ctbnwfb_db last updated time or cached version! Forcing to be no update");
                    resolve(false);
                }
                resolve(lastUpdatedInt > localVerInt);
            },
            error: function (err) {
                console.error("Error: Could not check ctbnwfb_db update!");
                resolve(false);
            }
        });
    };

    this.getRefStopId = function (stopName) {
        stopName = stopName.toUpperCase();
        var splits = stopName.split("\/");
        for (var stop of this.db.stops) {
            if (stopName.includes(stop.stopName.toUpperCase())) {
                return stop.stopId;
            }
        }
        return false;
    };

    this.fetchEta = function (resolve, reject, options) {
        var agencyId = options.agency["agency_id"];
        var multi = false;
        if (agencyId.includes("+")) {
            multi = true;
            var splits = agencyId.split("+");
            for (var split of splits) {
                if (split === "CTB" || split === "NWFB") {
                    agencyId = split;
                    break;
                }
            }
        }

        if (agencyId !== "CTB" && agencyId !== "NWFB") {
            console.error("Error: Cannot request ETA from companies that are not CTB and NWFB! Requested: " + agencyId);
            reject();
            return;
        }

        gtfs.getAgency("gtwp-hktransit", "hktransit", agencyId).then(etaAgency => {
            var stopId = options.stop["stop_id"];
            var stopName = gtfs.selectAgencyStopName(agencyId, options.stop["stop_name"]);
            var refStopId = this.getRefStopId(stopName);

            if (!refStopId) {
                console.error("Error: Could not find CTBNWFB reference stop ID using " + stopName);
                reject();
                return;
            }

            var url = "https://rt.data.gov.hk/v1/transport/citybus-nwfb/eta/" + agencyId + "/" + refStopId + "/" + options.route["route_short_name"];
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

                    var sches = resp.data;
                    if (sches.length > 0) {
                        var i;
                        var etaTime;
                        var sche;
                        for (i = 0; i < sches.length; i++) {
                            sche = sches[i];

                            if (sche["eta"] && sche["eta"] !== "") {
                                etaTime = parseIsoDatetime(sche["eta"]);
                                updates.push({
                                    "stopId": stopId,
                                    "arrival": {
                                        time: etaTime.getTime()
                                    }
                                });
                            }

                            if ((sche["rmk_en"] && sche["rmk_en"] !== "") ||
                                (sche["rmk_tc"] && sche["rmk_tc"] !== "") ||
                                (sche["rmk_sc"] && sche["rmk_sc"] !== "")) {
                                var transText = [
                                    {
                                        text: sche["rmk_en"],
                                        language: "en"
                                    },
                                    {
                                        text: sche["rmk_tc"],
                                        language: "zh-HK"
                                    },
                                    {
                                        text: sche["rmk_sc"],
                                        language: "zh-CN"
                                    }
                                ];
                                alerts.push({
                                    informedEntity: [
                                        {
                                            trip: tripDesc,
                                            stopId: stopId
                                        }
                                    ],
                                    headerText: {
                                        translation: transText
                                    },
                                    descriptionText: {
                                        translation: transText
                                    }
                                });
                            }
                        }
                    }


                    var time = Date.now();
                    if (updates.length > 0) {
                        var vehicleDesc = {
                            label: Lang.localizedKey(etaAgency, "agency_short_name")
                        };

                        var entityId = options.agency["agency_id"] + "-" + options.stop["stop_id"] + "-" + options.route["route_short_name"] + "-trip-update-" + time;
                        var entity = {
                            id: entityId,
                            tripUpdate: {
                                trip: tripDesc,
                                stopTimeUpdate: updates
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
                                alert: alerts[i]
                            };
                            entities.push(entity);
                        }
                    }

                    var feed = {
                        header: {
                            gtfsRealtimeVersion: "2.0",
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
            url: "https://db.hktransit.ml/ctbnwfb_db.json",
            cache: false,
            dataType: "json",
            success: function (data) {
                if (!data.routes || !data.stops || !data.version) {
                    console.error("Error: CTBNWFB downloaded database is in wrong structure! Report to GitHub for this problem!");
                    return;
                }
                data["package"] = "gtwp-ctbnwfb";
                data["provider"] = "ctbnwfb";
                resolve(data);
            },
            error: function (err, err1, err2) {
                reject();
            }
        });
    };
};