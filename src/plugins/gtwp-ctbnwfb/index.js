//GTWP CTBNWFB ETA Plugin

import * as TransitEta from '../../gtw-citydata-transit-eta';
import * as Cors from '../../gtw-cors';
import * as gtfs from '../../gtw-citydata-transit-gtfs';
import * as Lang from '../../gtw-lang';

export function onload() {
    console.log("Called me!");
    Cors.register("db.kmbeta.ml", true);
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
        console.log("Check update!");
        resolve(false);
    };

    this.getRefStopId = function (stopName) {
        stopName = stopName.toUpperCase();
        console.log(stopName);
        var splits = stopName.split("\/");
        for (var stop of this.db.stops) {
            if (stopName.includes(stop.stopName.toUpperCase())) {
                console.log(stop);
                return stop.stopId;
            }
        }
        return false;
    };

    this.fetchEta = function (resolve, reject, options) {
        var agencyId = options.agency["agency_id"];
        if (agencyId.includes("+")) {
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
            console.log(etaAgency);
            console.log(options.stop["stop_name"]);
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
                        "trip_id": options.trip["trip_id"],
                        "start_time": "00:00:00",
                        "start_date": "20190101"
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
                                    "stop_id": stopId,
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
                                    "informed_entity": [
                                        {
                                            trip: tripDesc,
                                            "stop_id": stopId
                                        }
                                    ],
                                    "header_text": {
                                        translation: transText
                                    },
                                    "description_text": {
                                        translation: transText
                                    }
                                });
                            }
                        }
                    }

                    var vehicleDesc = {
                        label: Lang.localizedKey(etaAgency, "agency_name")
                    };

                    var time = Date.now();
                    if (updates.length > 0) {
                        var entityId = options.agency["agency_id"] + "-" + options.stop["stop_id"] + "-" + options.route["route_short_name"] + "-trip-update-" + time;
                        var entity = {
                            id: entityId,
                            vehicle: {
                                vehicle: vehicleDesc
                            },
                            "trip_update": {
                                trip: tripDesc,
                                "stop_time_update": updates
                            }
                        };
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
                            "gtfs_realtime_version": "2.0",
                            incrementality: "FULL_DATASET",
                            timestamp: time
                        },
                        entity: entities
                    };

                    console.log(feed);
                    resolve(feed);
                },
                error: function (err0, err1, err2) {
                    reject();
                }
            });
        });
    };

    this.fetchDatabase = function (resolve, reject) {
        console.log("Fetch db!");
        $.ajax({
            url: "https://db.kmbeta.ml/ctbnwfb_db.json",
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