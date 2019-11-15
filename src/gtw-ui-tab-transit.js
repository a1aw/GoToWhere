import * as Transit from './gtw-citydata-transit';
import * as TransitEta from './gtw-citydata-transit-eta';
import * as RequestLimiter from './gtw-requestlimiter';
import * as Settings from './gtw-settings';
import * as Misc from './gtw-misc';
import * as Lang from './gtw-lang';
import * as Loc from './gtw-location';
import * as TouchKeypad from './gtw-ui-touchkeypad';
import * as Event from './gtw-event';
import * as UI from './gtw-ui';
import * as Map from './gtw-map';
import * as gtfs from './gtw-citydata-transit-gtfs';
import { languages } from './gtw-lang';

var searchTimeout;
var updateStopEtaTimer;
var updateEtaTimer;
var allNearbyRoutes;
var maxRequest;
var touchKeypadListener;
var eventUiBackListener;
var eventLocChgListener;
var lastLat = false;
var lastLng = false;
var searchMode = false;

function showTouchKeypad() {
    //$("#search-transit-text").removeAttr("readonly");
    TouchKeypad.showTouchKeypad();
}

function hideTouchKeypad() {
    //$("#search-transit-text").attr("readonly", "readonly");
    TouchKeypad.hideTouchKeypad();
}

function showSearchRoutes() {
    searchMode = true;

    $("#button-cancel-search").removeClass("btn-light");
    $("#button-cancel-search").removeClass("disabled");
    $("#button-cancel-search").addClass("btn-danger");
    $("#button-cancel-search").html("<i class=\"fas fa-times\"></i>");

    $(".nearby-route-list").css("display", "none");
    $(".all-route-list").css("display", "flex");
    Map.setCenter(Loc.getCurrentPosition());
    Map.setZoom(16);
    Map.removeAllMarkers();
    Map.removeAllPolylines();
    searchRoutes();
    resetProviderSort();
    filterProviderSort(".all-route-list");
}


function hideSearchRoutes() {
    searchMode = false;

    $("#button-cancel-search").addClass("btn-light");
    $("#button-cancel-search").addClass("disabled");
    $("#button-cancel-search").removeClass("btn-danger");
    $("#button-cancel-search").html("<i class=\"fas fa-search\"></i>");

    $(".nearby-route-list").css("display", "flex");
    $(".all-route-list").css("display", "none");

    Map.setCenter(Loc.getCurrentPosition());
    Map.setZoom(16);
    Map.removeAllMarkers();
    Map.removeAllPolylines();

    resetProviderSort();
    filterProviderSort(".nearby-route-list");
}

function filterProviderSort(listNodeCss) {
    $(".gtw-providersort-provider").each(function () {
        var pkg = $(this).attr("data-gtw-package");
        var provider = $(this).attr("data-gtw-provider");
        var agency = $(this).attr("data-gtw-agency");

        var cssCond = "[data-gtw-package='" + pkg + "'][data-gtw-provider='" + provider + "'][data-gtw-agency='" + agency + "']";

        var contain = $(listNodeCss + " .route-selection" + cssCond + "").length > 0;
        if (contain) {
            $(this).css("display", "");
        } else {
            $(this).css("display", "none");
        }
    });
}

var GTFS_CALENDAR_IDS = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday"
]

var GTFS_CALENDAR_NAMES = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
]

async function searchRoutes() {
    TouchKeypad.setEnabled({});
    TouchKeypad.disableFunctionKeys();

    var val = $("#search-transit-text").val();

    var useKeypad = true;
    if (!useKeypad) {
        clearSearch();
        return;
    }
    
    var firstLetters;
    
    var html = "<ul class=\"list-group\">";

    if (val.length === 0) {
        firstLetters = await gtfs.getAllRouteNames(val.length, 1, true);
    } else {
        var result = await gtfs.searchRoutes(val);

        var i;
        var j;
        var k;
        var l;
        var routeName;
        var trips;
        var trip;
        var route;
        var agency;
        var tripId;
        var routeId;
        var lastStop;
        var stopTimes;
        var calendar;
        var calendars = {};
        var calendarDates = {};
        var serviceId;
        var serviceIds = {};
        firstLetters = [];

        var pkg;
        var provider;
        var agencyId;
        
        var serviceArray;
        var noServiceArray;

        var count = 0;

        for (i = 0; i < result.length; i++) {
            route = result[i];
            routeId = route["route_id"];
            routeName = Lang.localizedKey(route, "route_short_name");
            pkg = route["package"];
            provider = route["provider"];
            agencyId = route["agency_id"];

            if (val.length < routeName.length) {
                var str = routeName.substr(val.length, 1);
                if (!firstLetters.includes(str)) {
                    firstLetters.push(str);
                }
            }

            agency = await gtfs.getAgency(pkg, provider, agencyId);
            trips = await gtfs.getTripsByRouteId(pkg, provider, routeId);
            for (j = 0; j < trips.length; j++) {
                trip = trips[j];
                tripId = trip["trip_id"];
                serviceId = trip["service_id"];

                if (!serviceIds[routeId]) {
                    serviceIds[routeId] = [];
                } else if (serviceIds[routeId].includes(serviceId)) {
                    continue;
                }
                serviceIds[routeId].push(serviceId);

                if (!calendars[serviceId]) {
                    calendars[serviceId] = await gtfs.getCalendar(pkg, provider, serviceId);
                }
                calendar = calendars[serviceId];

                //TODO: Calendar Dates

                html +=
                    "<li class=\"list-group-item list-group-item-action d-flex align-items-center route-selection\"  data-gtw-package=\"" + pkg + "\" data-gtw-provider=\"" + provider + "\" data-gtw-agency=\"" + agencyId + "\" data-gtw-route-id=\"" + route["route_id"] + "\" data-gtw-trip-id=\"" + tripId + "\">" +
                    "    <div class=\"d-flex flex-column route-id\">" +
                    "        <div>" + Lang.localizedKey(agency, "agency_name") + "</div>" +
                    "        <div>" + routeName + "</div>" +
                    "    </div>" +
                    "    <div class=\"d-flex flex-column stop-info mr-auto\">";

                //TODO: Detect RAW stop times
                if (gtfs.isStopTimesValid(pkg, provider)) {
                    stopTimes = await gtfs.getStopTimesByTripId(pkg, provider, tripId);
                    lastStop = await gtfs.getStop(pkg, provider, stopTimes[stopTimes.length - 1]["stop_id"]);

                    html += "        <div><b>" + $.i18n("transit-eta-to") + ":</b> " + gtfs.selectAgencyStopName(agency["agency_id"], Lang.localizedKey(lastStop, "stop_name")) + "</div>";
                } else {
                    html += "        <div><em>Click for details.</em></div>";
                }

                html += "<div><span class=\"badge badge-secondary\">"
                for (k = 0; k < GTFS_CALENDAR_IDS.length; k++) {
                    html += calendar[GTFS_CALENDAR_IDS[k]];
                }
                html += "</span></div>"
                /*
                var firstPos = 0;
                var lastVal = calendar[GTFS_CALENDAR_IDS[0]];
                var count = 0;
                var onlyMode = false;
                console.log("RN: " + routeName);
                console.log(calendar);
                for (k = 0; k < GTFS_CALENDAR_IDS.length; k++) {
                    if (lastVal === calendar[GTFS_CALENDAR_IDS[k]]) {
                        count++;
                    } else {
                        if (count > 1) {
                            if (count === 2) {
                                html +=
                                    "<span class=\"badge badge-secondary\">" +
                                    $.i18n("transit-" + (onlyMode ? "only-" : "") + (lastVal === 0 ? "no" : "provide") + "-service-and-week", GTFS_CALENDAR_NAMES[firstPos], GTFS_CALENDAR_NAMES[k - 1]) +
                                    "</span>";
                            } else {
                                if (lastVal === 1) {
                                    html +=
                                        "<span class=\"badge badge-secondary\">" +
                                        $.i18n("transit-" + (onlyMode ? "only-" : "") + "provide-service-from-to-week", GTFS_CALENDAR_NAMES[firstPos], GTFS_CALENDAR_NAMES[k - 1]) +
                                        "</span>";
                                } else if (count < 6) {
                                    html +=
                                        "<span class=\"badge badge-secondary\">" +
                                        $.i18n("transit-" + (onlyMode ? "only-" : "") + "no-service-from-to-week", GTFS_CALENDAR_NAMES[firstPos], GTFS_CALENDAR_NAMES[k - 1]) +
                                        "</span>";
                                } else {
                                    onlyMode = true;
                                }
                            }
                        } else {
                            for (l = firstPos; l < k - 1; l++) {
                                html +=
                                    "<span class=\"badge badge-secondary\">" +
                                    $.i18n("transit-" + (onlyMode ? "only-" : "") + (calendar[GTFS_CALENDAR_IDS[l]] === 0 ? "no" : "provide") + "-service-on-week", GTFS_CALENDAR_NAMES[l]) +
                                    "</span>";
                            }
                        }
                        
                        if (k === GTFS_CALENDAR_IDS.length - 1) {
                            html +=
                                "<span class=\"badge badge-secondary\">" +
                                $.i18n("transit-" + (onlyMode ? "only-" : "") + (calendar[GTFS_CALENDAR_IDS[k]] === 0 ? "no" : "provide") + "-service-on-sunday") +
                                "</span>";
                        } else {
                            count = 1;
                            firstPos = k;
                        }
                    }
                    lastVal = calendar[GTFS_CALENDAR_IDS[k]];
                }
                */

                html +
                    "    </div>" +
                    "</li>";
            }
        }
    }

    html += "</ul>";
    $(".all-route-list").html(html);

    console.log(firstLetters);
    var availableKeypads = {};
    for (var firstLetter of firstLetters) {
        availableKeypads[firstLetter] = true;
    }
    console.log(availableKeypads);
    TouchKeypad.setEnabled(availableKeypads);
    TouchKeypad.enableFunctionKeys();

    $(".all-route-list .route-selection").on("mouseenter", mouseEnterPreviewRoute);
    $(".all-route-list .route-selection").on("click", mouseClickSelectRoute);

    //$(".all-route-list .route-selection:nth-child(1)").mouseenter();

    filterProviderSort(".all-route-list");

    adjustMargin();
}

function resetProviderSort() {
    $(".gtw-providersort").removeClass("btn-primary");
    $(".gtw-providersort-all").addClass("btn-primary");

    //$(".gtw-providersort-provider").addClass("btn-default");
    $(".route-selection").attr("style", "");
}

function clearSearch() {
    hideTouchKeypad();
    $("#search-transit-text").val("");
    hideSearchRoutes();
    TouchKeypad.reset();
}

async function drawTripOnMap(stopTimes) {
    var coords = [];
    var pos;
    var stop;
    var i;
    for (i = 0; i < stopTimes.length; i++) {
        stop = await gtfs.getStop(stopTimes[i]["package"], stopTimes[i]["provider"], stopTimes[i]["stop_id"]);
        pos = { lat: stop["stop_lat"], lng: stop["stop_lon"] };
        coords.push(pos);
        Map.addMarker(pos, {
            title: stop["stop_name"],
            label: "" + (i + 1)
        });
    }
    Map.addPolyline(coords, "#FF0000", 2);
}

function mouseClickSelectRoute() {
    //fromSearch = $(this).parent().parent().hasClass("all-route-list");

    var pkg = $(this).attr("data-gtw-package");
    var provider = $(this).attr("data-gtw-provider");
    var agency = $(this).attr("data-gtw-agency");
    var routeId = $(this).attr("data-gtw-route-id");
    var tripId = $(this).attr("data-gtw-trip-id");
    var stopId = $(this).attr("data-gtw-stop-id");

    /*
    if (!stop) {
        var pos = Loc.getCurrentPosition();
        var path = route.paths[bound];
        var pathStop;
        var distance;
        var nearestDistance = false;
        var nearestStop = false;
        for (var stopId of path) {
            pathStop = TransitStops.getStopById(stopId);
            distance = Misc.geoDistance(pathStop.lat, pathStop.lng, pos.lat, pos.lng);
            if (!nearestDistance || !nearestStop || distance < nearestDistance) {
                nearestDistance = distance;
                nearestStop = pathStop;
            }
        }

        console.log(nearestDistance);
        if (nearestDistance <= 2) {
            stop = nearestStop;
        }
    }
    */

    var valid = gtfs.isStopTimesValid(pkg, provider);

    if (!valid) {
        UI.showModal("loading",
            "Showing Route",
            "Loading route...",
            "After stop times database built up, this process can be speeded up, enables to discover nearby transit and allows to preview routes."
        );
    }

    showRouteList(pkg, provider, agency, routeId, tripId, stopId, true, true).then(function () {
        UI.hidePanel();
        hideTouchKeypad();

        Map.removeAllMarkers();
        Map.removeAllPolylines();

        if (!valid) {
            UI.hideModal();
        }
    });
}

function mouseEnterPreviewRoute() {
    Map.removeAllMarkers();
    Map.removeAllPolylines();
    var provider = TransitRoutes.getProvider($(this).attr("gtw-provider"));
    var route = provider.getRouteById($(this).attr("gtw-route-id"));
    var sstop = TransitStops.getStopById($(this).attr("gtw-stop-id"));
    var bound = $(this).attr("gtw-bound");
    drawRouteOnMap(route, bound);

    if (sstop) {
        var targetPos = { lat: sstop.lat, lng: sstop.lng };
        Map.setCenter(targetPos);
        Map.setZoom(18);
    } else {
        var path = route.paths[bound];

        var latlngs = [];
        var stop;
        for (var stopId of path) {
            stop = TransitStops.getStopById(stopId);
            latlngs.push({ lat: parseFloat(stop.lat), lng: parseFloat(stop.lng) });
        }
        Map.fitBounds(latlngs);
    }
}

async function showRouteList(pkg, provider, agencyId, routeId, tripId, stopId, scroll = false, draw = false) {
    var html = "<div class=\"row\" style=\"padding: 2%;\"><div class=\"timeline-centered\">";
    var stopTimes = await gtfs.getStopTimesByTripId(pkg, provider, tripId);
    var i;
    var stop;
    for (i = 0; i < stopTimes.length; i++) {
        //TODO: Fare attributes and rules
        stop = await gtfs.getStop(pkg, provider, stopTimes[i]["stop_id"]);
        html +=
            "<article class=\"timeline-entry\" data-gtw-package=\"" + pkg + "\" data-gtw-provider=\"" + provider + "\" data-gtw-agency=\"" + agencyId + "\" data-gtw-route-id=\"" + routeId + "\" data-gtw-trip-id=\"" + tripId + "\" data-gtw-stop-id=\"" + stop["stop_id"] + "\">" +
            "    <div class=\"timeline-entry-inner\">" +
            "        <div class=\"timeline-icon bg-light\">" +
            "            " + (i + 1) +
            "        </div>" +
            "        <div class=\"timeline-label\">" +
            "            <h2><button style=\"padding: 0px;\" class=\"btn btn-link\" data-gtw-package=\"" + pkg + "\" data-gtw-provider=\"" + provider + "\" data-gtw-agency=\"" + agencyId + "\" data-gtw-route-id=\"" + routeId + "\" data-gtw-trip-id=\"" + tripId + "\" data-gtw-stop-id=\"" + stop["stop_id"] + "\" data-gtw-stop-sequence=\"" + stopTimes[i]["stop_sequence"] + "\" data-gtw-stop-index=\"" + i + "\">" + gtfs.selectAgencyStopName(agencyId, Lang.localizedKey(stop, "stop_name")) + "</button></h2>" +
            "            <p></p>" +
            "        </div>" +
            "    </div>" +
            "</article>"
            ;
    }
    html += "</div></div>";
    $(".half-map-container").html(html);

    $(".half-map-container button").on("click", function () {
        var pkg = $(this).attr("data-gtw-package");
        var provider = $(this).attr("data-gtw-provider");
        var agencyId = $(this).attr("data-gtw-agency");
        var routeId = $(this).attr("data-gtw-route-id");
        var tripId = $(this).attr("data-gtw-trip-id");
        var stopId = $(this).attr("data-gtw-stop-id");
        routeListSelectStop(pkg, provider, agencyId, routeId, tripId, stopId);
    });

    var route = await gtfs.getRoute(pkg, provider, routeId);
    var agency = await gtfs.getAgency(pkg, provider, agencyId);
    var lastStopTime = stopTimes[stopTimes.length - 1];
    var lastStop = await gtfs.getStop(pkg, provider, lastStopTime["stop_id"]); 
    html =
        "<ul class=\"list-group\"><li class=\"list-group-item d-flex align-items-center route-selection\">" +
        "    <div class=\"d-flex flex-column route-id\">" +
        "        <div>" + Lang.localizedKey(agency, "agency_name") + "</div>" +
        "        <div>" + Lang.localizedKey(route, "route_short_name") + "</div>" +
        "    </div>" +
        "    <div><b>" + $.i18n("transit-eta-to") + ":</b> " + gtfs.selectAgencyStopName(agencyId, Lang.localizedKey(lastStop, "stop_name")) + "</div>" +
        "</li></ul>"
        ;
    $(".half-map-tab-panel").html(html);

    if (draw) {
        drawTripOnMap(stopTimes);
    }

    adjustMargin();

    if (stopId) {
        routeListSelectStop(pkg, provider, agencyId, routeId, tripId, stopId);
    }
}

async function routeListSelectStop(pkg, provider, agencyId, routeId, tripId, stopId) {
    var parent = screen.width >= 768 ? ".desktop" : ".mobile";

    var node = $(parent + " .timeline-entry[data-gtw-stop-id='" + stopId + "']");

    var icon = node.children().children(".timeline-icon");
    icon.removeClass("bg-light");
    icon.addClass("bg-primary");

    if (scroll) {
        node[0].scrollIntoView();
    }

    var agency = await gtfs.getAgency(pkg, provider, agencyId);
    var route = await gtfs.getRoute(pkg, provider, routeId);
    var trip = await gtfs.getTrip(pkg, provider, tripId);
    var stop = await gtfs.getStop(pkg, provider, stopId);

    console.log(trip);

    var targetPos = { lat: stop["stop_lat"], lng: stop["stop_lon"] };

    Map.setCenter(targetPos);
    Map.setZoom(18);

    clearInterval(updateStopEtaTimer);
    var func = function () {
        showStopEta(agency, route, trip, stop);
    };
    func();
    updateStopEtaTimer = setInterval(func, 30000);
}

function showStopEta(agency, route, trip, stop) {
    var node = $(".timeline-entry[data-gtw-stop-id='" + stop["stop_id"] + "'] p");

    var content =
        "<p><u>" + $.i18n("transit-eta") + "</u></p>" +
        "<table class=\"table stop-eta\">"
        ;

    var p = TransitEta.fetchEta({
        etaProviders: agency["agency_id"].split("+"),
        agency: agency,
        route: route,
        trip: trip,
        stop: stop
    });
    if (!p) {
        content +=
            "<tr class=\"table-dark\">" +
            "    <td colspan=\"4\">" + $.i18n("transit-eta-route-not-available") + "</td>" +
            //"    <td>---</td>" +
            "</tr>"
            ;
    } else {
        content +=
            "<tr class=\"table-dark\">" +
            "    <td colspan=\"4\"><div class=\"spinner-border spinner-border-sm\" role=\"status\"></div> " + $.i18n("transit-eta-retrieving-data") + "</td>" +
            "</tr>";
        p.then(function (returned) {
            var opt = returned.options;
            var content = "";
            var node = $(".timeline-entry[data-gtw-stop-id='" + opt.stop["stop_id"] + "'] p table tbody");
            if (returned.code === -2) {
                content +=
                    "<tr class=\"table-dark\">" +
                    "    <td colspan=\"4\">" + $.i18n("transit-eta-no-eta-providers") + "</td>" +
                    //"    <td>---</td>" +
                    "</tr>"
                    ;
            } else if (returned.feeds.length === 0 || returned.code === -1) {
                content +=
                    "<tr class=\"table-dark\">" +
                    "    <td colspan=\"4\">" + $.i18n("transit-eta-no-data-received") + "</td>" +
                    //"    <td>---</td>" +
                    "</tr>"
                    ;
            } else {
                var alerts = [];
                var pairs = [];
                for (var feed of returned.feeds) {
                    for (var entity of feed.entity) {
                        var tripUpdate = entity["trip_update"];
                        if (tripUpdate) {
                            var timestamp = tripUpdate.timestamp ? tripUpdate.timestamp : feed.header.timestamp;
                            pairs.push({
                                timestamp: timestamp,
                                tripUpdate: tripUpdate
                            });
                        }

                        if (entity["alert"]) {
                            alerts.push(entity["alert"]);
                        }
                    }
                }

                if (pairs.length === 0) {
                    content +=
                        "<tr class=\"table-dark\">" +
                        "    <td colspan=\"4\">" + $.i18n("transit-eta-no-schedules-pending") + "</td>" +
                        //"    <td>---</td>" +
                        "</tr>"
                        ;
                } else {
                    var active = false;
                    for (var pair of pairs) {
                        var stopTimeUpdates = pair.tripUpdate["stop_time_update"];
                        if (stopTimeUpdates && stopTimeUpdates.length > 0) {
                            for (var stopTimeUpdate of stopTimeUpdates) {
                                if (!stopTimeUpdate["schedule_relationship"] || stopTimeUpdate["schedule_relationship"] === "SCHEDULED") {
                                    var etaTime;
                                    //TODO: Calculate non-absolute time from trips
                                    if (stopTimeUpdate.departure) {
                                        etaTime = stopTimeUpdate.departure.time;
                                    } else if (stopTimeUpdate.arrival) {
                                        etaTime = stopTimeUpdate.arrival.time;
                                    }

                                    var eta = Math.floor((etaTime - pair.timestamp) / 1000 / 60);

                                    var html = "<tr class=\"table-";

                                    if (eta >= 20) {
                                        html += "secondary";
                                    } else if (eta >= 15) {
                                        html += "info";
                                    } else if (eta >= 10) {
                                        html += "success";
                                    } else if (eta >= 5) {
                                        html += "warning";
                                    } else if (eta >= 1) {
                                        html += "danger";
                                    } else {
                                        html += "dark";
                                    }

                                    if (!active && eta > 0) {
                                        active = true;
                                        html += " active";
                                    }

                                    html += "\">";

                                    /*
                                    //TODO: isOutdated

                                    var provider = TransitEta.getProvider(schedule.provider);
                                    if (!provider) {
                                        console.error("Error: Could not find TransitEta provider to get localized names: " + schedule.provider);
                                        return;
                                    }
                                    */

                                    var colspan = 4;

                                    /*
                                    if (opt.etaProviders.length > 1) {
                                        html += "<td>" + Lang.localizedKey(provider, "name") + "</td>";
                                        colspan--;
                                    }
                                    */

                                    if (pair.tripUpdate["vehicle"] && pair.tripUpdate["vehicle"]["vehicle"] && pair.tripUpdate["vehicle"]["vehicle"]["label"]) {
                                        html += "<td>" + pair.tripUpdate["vehicle"]["vehicle"]["label"] + "</td>";
                                        colspan--;
                                    }

                                    /*
                                    if (schedule.msg !== undefined && schedule.time === undefined) {
                                        html += "<td colspan=\"" + colspan + "\">" + schedule.msg + "</td>";
                                    }
                                    */

                                    html += "<td>";
                                    /*
                                    if (schedule.msg !== undefined) {
                                        html += schedule.msg;
                                    }
                                    if (schedule.time !== undefined) {
                                        if (schedule.msg !== undefined) {
                                            html += "<br />";
                                        }
                                    }
                                    */

                                    if (eta > 0) {
                                        html += $.i18n("transit-eta-minutes", eta);
                                    } else {
                                        html += $.i18n("transit-eta-arrived-left");
                                    }

                                    html += "</td><td";

                                    /*
                                    if (schedule.isLive === undefined) {
                                    }
                                    */
                                    html += " colspan=\"2\"";

                                    html += ">";

                                    var time = new Date(etaTime);

                                    html += Misc.fillZero(time.getHours()) + ":" + Misc.fillZero(time.getMinutes());
                                    /*
                                    if (schedule.time !== undefined) {
                                    } else {
                                        html += "---";
                                    }
                                    */

                                    html += "</td>";

                                    /*
                                    if (schedule.isLive !== undefined) {
                                        if (schedule.isLive) {
                                            html += "<td><span style=\"color: red; float: right; font-size: 10px;\"><i class=\"fa fa-circle\"></i> " + $.i18n("transit-eta-live") + "</span></td>";
                                        } else {
                                            html += "<td><span style=\"font-size: 10px; float: right; font-style: italic;\">" + $.i18n("transit-eta-scheduled") + "</span></td>";
                                        }
                                    }
                                    */

                                    html += "</tr>";
                                    content += html;
                                } else {
                                    //TODO: cancelled
                                }
                            }
                        } else {
                            //TODO: NO Data
                        }
                    }
                }
            }
            node.html(content);
            
        }).catch(function (options, err) {
            var node = $(".timeline-entry[stop-id='" + options.stopId + "'] p table tbody");
            node.html("<tr class=\"table-danger\"><td colspan=\"4\">" + $.i18n("transit-eta-error-fetching-eta") + "</td></tr>");
        });
    }

    content += "</table>";

    node.html(content);
}

function updateEta() {
    var requestLen = RequestLimiter.requests.length;
    if (requestLen > 0) {
        $(".request-progress-panel").fadeIn(500);

        var max = maxRequest;
        if (!max || requestLen > max) {
            max = maxRequest = requestLen;
        }

        $(".request-progress-panel .progress-bar").html($.i18n("transit-eta-requesting-data", max - requestLen, max));
        //$(".request-progress-panel .progress-bar").html(Math.floor((max - requestLen) / max * 100) + "%");
        $(".request-progress-panel .progress-bar").css("width", Math.floor((max - requestLen) / max * 100) + "%");
    } else {
        maxRequest = 0;
        $(".request-progress-panel .progress-bar").css("width", "100%");
        $(".request-progress-panel").fadeOut(500, function () {
            $(".request-progress-panel .progress-bar").css("width", "0%");
        });
    }
    //var h;
    for (var result of allNearbyRoutes) {
        var agency = gtfs.get
        var p = TransitEta.fetchEta({
            etaProviders: result.route["agency_id"].split("+"),
            agency: result.agency,
            route: result.route,
            trip: result.trip,
            stop: result.stop
        });
        p.then(function (returned) {
            console.log("Returned feed!");
            console.log(returned);
            var text = "";
            var opt = returned.options;

            var node = $(".nearby-route-list .route-selection[data-gtw-package=\"" + opt.agency["package"] + "\"][data-gtw-provider=\"" + opt.agency["provider"] + "\"][data-gtw-agency=\"" + opt.agency["agency_id"] + "\"][data-gtw-route-id=\"" + opt.route["route_id"] + "\"][data-gtw-trip-id=\"" + opt.trip["trip_id"] + "\"][data-gtw-stop-id=\"" + opt.stop["stop_id"] + "\"]");

            node.removeClass("list-group-item-secondary");
            node.removeClass("list-group-item-info");
            node.removeClass("list-group-item-success");
            node.removeClass("list-group-item-warning");
            node.removeClass("list-group-item-danger");
            node.removeClass("list-group-item-light");
            node.removeClass("list-group-item-dark");

            var badgeClass = "btn-secondary";

            if (returned.code < 0) {
                text = $.i18n("transit-eta-route-not-available-short");
                node.addClass("list-group-item-light");
            } else if (returned.feeds.length === 0) {
                text = $.i18n("transit-eta-no-feed-received");
                node.addClass("list-group-item-light");
            } else {
                var pairs = [];
                for (var feed of returned.feeds) {
                    for (var entity of feed.entity) {
                        var tripUpdate = entity["trip_update"];
                        if (tripUpdate) {
                            var timestamp = tripUpdate.timestamp ? tripUpdate.timestamp : feed.header.timestamp;
                            pairs.push({
                                timestamp: timestamp,
                                tripUpdate: tripUpdate
                            });
                        }
                    }
                }
                //TODO: Sort trip updates
                /*
                tripUpdates.sort((a, b) => {
                    if (a["stop_time_update"].departure && b["stop_time_update"].departure) {
                        return a["stop_time_update"].departure - b["stop_time_update"].departure;
                    } else if (a["stop_time_update"].arrival && b["stop_time_update"].departure) {
                        return a["stop_time_update"].arrival - b["stop_time_update"].departure;
                    } else if (a["stop_time_update"].departure && b["stop_time_update"].arrival) {
                        return a["stop_time_update"].departure - b["stop_time_update"].arrival;
                    }
                });
                */
                if (pairs.length === 0) {
                    text = $.i18n("transit-eta-no-schedules-pending-short");
                    node.addClass("list-group-item-light");
                } else {
                    var pair = pairs[0];

                    var stopTimeUpdates = pair.tripUpdate["stop_time_update"];
                    if (stopTimeUpdates && stopTimeUpdates.length > 0) {
                        var stopTimeUpdate = stopTimeUpdates[0];

                        if (!stopTimeUpdate["schedule_relationship"] || stopTimeUpdate["schedule_relationship"] === "SCHEDULED") {
                            var etaTime;
                            //TODO: Calculate non-absolute time from trips
                            if (stopTimeUpdate.departure) {
                                etaTime = stopTimeUpdate.departure.time;
                            } else if (stopTimeUpdate.arrival) {
                                etaTime = stopTimeUpdate.arrival.time;
                            }

                            //TODO: uncertainty

                            var calcEta = Math.floor((etaTime - pair.timestamp) / 1000 / 60);
                            console.log("calculated eta: " + calcEta);

                            var css = "";

                            if (calcEta >= 20) {
                                css = "secondary";
                            } else if (calcEta >= 15) {
                                css = "info";
                            } else if (calcEta >= 10) {
                                css = "success";
                            } else if (calcEta >= 5) {
                                css = "warning";
                            } else if (calcEta >= 1) {
                                css = "danger";
                            } else {
                                css = "dark";
                            }
                            node.addClass("list-group-item-" + css);

                            badgeClass = "badge-primary";
                            if (calcEta > 0) {
                                text += $.i18n("transit-eta-minutes", calcEta);
                            } else {
                                text += $.i18n("transit-eta-arrived-left", calcEta);
                                badgeClass = "badge-dark";
                            }
                            /*
                            if (schedule.msg !== undefined) {
                                var msg = schedule.msg;
                                if (msg.length > 20) {
                                    text = $.i18n("transit-eta-transit-notice");
                                } else {
                                    text = schedule.msg;
                                }
                                badgeClass = "badge-warning";
                            } else if (schedule.time !== undefined) {
                                if (schedule.msg !== undefined) {
                                    text += "<br />";
                                }

                                

                                if (schedule.isLive !== undefined) {
                                    text += "<br /><span style=\"font-size: 10px; position: absolute; top: 16px; right: 16px; ";
                                    if (schedule.isLive) {
                                        text += "color: red;\"><i class=\"fa fa-circle\"></i> " + $.i18n("transit-eta-live") + "</span>";
                                    } else {
                                        text += "color: black; font-style: italic;\">" + $.i18n("transit-eta-scheduled") + "</span>";
                                    }
                                }
                            }
                            */
                        } else {
                            //TODO: No data or skipped
                            console.log("NODATA");
                        }
                    } else {
                        //TODO: Cancelled
                        console.log("Cancelled");
                    }        
                }
            }

            var badge = node.children(".transit-eta");

            console.log(badge);

            badge.removeClass("badge-primary");
            badge.removeClass("badge-secondary");
            badge.removeClass("badge-warning");
            badge.removeClass("badge-danger");
            badge.removeClass("badge-dark");
            badge.addClass(badgeClass);

            badge.html(text);
        }).catch(function (options, err) {
            var node = $(".nearby-route-list .route-selection[gtw-provider=\"" + options.provider + "\"][gtw-route-id=\"" + options.routeId + "\"][gtw-bound=\"" + options.selectedPath + "\"][gtw-stop-id=\"" + options.stopId + "\"]");

            node.removeClass("list-group-item-secondary");
            node.removeClass("list-group-item-info");
            node.removeClass("list-group-item-success");
            node.removeClass("list-group-item-warning");
            node.removeClass("list-group-item-danger");
            node.removeClass("list-group-item-light");
            node.removeClass("list-group-item-dark");
            node.addClass("list-group-item-light");

            var badge = node.children(".transit-eta");

            badge.removeClass("badge-primary");
            badge.removeClass("badge-secondary");
            badge.removeClass("badge-warning");
            badge.removeClass("badge-danger");
            badge.removeClass("badge-dark");
            badge.addClass("badge-danger");

            badge.html($.i18n("transit-eta-error-fetching-eta-short"));
        });
    }
}

async function findNearbyRoutes() {
    clearInterval(updateEtaTimer);

    var pos = Loc.getCurrentPosition();

    var lat = pos.lat;
    var lng = pos.lng;

    lastLat = lat;
    lastLng = lng;

    var range = Settings.get("min_nearby_transit_range", 200) / 1000.0;
    
    var allNearbyStops = await gtfs.searchNearbyStops(lat, lng, range, true);

    if (allNearbyStops.length === 0) {
        var testRange = range;
        do {
            testRange += 0.05;
            allNearbyStops = await gtfs.searchNearbyStops(lat, lng, testRange, true, true);
        } while (allNearbyStops.length === 0 && testRange < 10);

        if (testRange >= 10) {
            $(".tab-panel").append(
                "<div class=\"alert alert-danger alert-dismissable\">" +
                "<button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-hidden=\"true\" >&#215;</button>" +
                "No routes are found in 10 km range." +
                "</div>"
            );
        } else {
            $(".tab-panel").append(
                "<div class=\"alert alert-warning alert-dismissable\">" +
                "<button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-hidden=\"true\" >&#215;</button>" +
                $.i18n("transit-eta-no-routes-found-nearby-extended-range", range * 1000, Math.ceil(testRange * 1000)) +
                "</div>"
            );
        }
    }

    var maxNearbyBusDisplay = Settings.get("max_nearby_transit_to_display", 20);
    allNearbyRoutes = [];
    console.log(allNearbyStops);

    for (var stopResult of allNearbyStops) {
        if (allNearbyRoutes.length >= maxNearbyBusDisplay) {
            break;
        }

        var stop = stopResult.stop;

        var pkg = stop["package"];
        var provider = stop["provider"];

        if (!gtfs.isStopTimesValid(pkg, provider)) {
            continue;
        }

        var stopRoutes = await gtfs.searchStopRoutes(pkg, provider, stop["stop_id"]);

        //TODO: seperate trips
        for (var routeId in stopRoutes.trips) {
            var trip = stopRoutes.trips[routeId];
            var agency = await gtfs.getAgency(pkg, provider, stopRoutes.routes[routeId]["agency_id"]);
            allNearbyRoutes.push({
                agency: agency,
                route: stopRoutes.routes[routeId],
                trip: trip,
                stop: stop,
                stopTime: stopRoutes.stopTimes[trip["trip_id"]],
                distance: stopResult.distance
            });
        }
    }

    console.log(allNearbyRoutes);

    var html;
    var distance;
    //var paths;
    //var stopId;

    var stop;
    var agency;
    html = "<div class=\"row item-list nearby-route-list\"" + (searchMode ? " style=\"display: none\"" : "") + "><ul class=\"list-group\">";
    for (var result of allNearbyRoutes) {
        //paths = result.route.paths[result.bound];
        //stopId = paths[paths.length - 1];

        distance = Math.round(result.distance * 1000);
        agency = await gtfs.getAgency(result.route["package"], result.route["provider"], result.route["agency_id"]);
        stop = await gtfs.getStop(result.stopTime["package"], result.stopTime["provider"], result.stopTime["stop_id"]);

        html +=
            "    <li class=\"list-group-item list-group-item-action d-flex justify-content-between align-items-center route-selection\" data-gtw-package=\"" + result.route["package"] + "\" data-gtw-provider=\"" + result.route["provider"] + "\" data-gtw-agency=\"" + result.route["agency_id"] + "\" data-gtw-route-id=\"" + result.route["route_id"] + "\" data-gtw-trip-id=\"" + result.trip["trip_id"] + "\" data-gtw-stop-id=\"" + result.stopTime["stop_id"] + "\" data-gtw-stop-seq=\"" + result.stopTime["stop_sequence"] + "\">" +
            "        <div class=\"d-flex flex-column route-id\">" +
            "            <div>" + Lang.localizedKey(agency, "agency_name") + "</div>" +
            "            <div>" + Lang.localizedKey(result.route, "route_short_name") + "</div>" +
            "        </div>" +
            "        <div class=\"d-flex flex-column stop-info mr-auto\">" +
            //"            <div>" + Lang.localizedKey(result.route, "route_long_name") + "</div>" +
            //"                <b>" + $.i18n("transit-eta-to") + ":</b> <small>" + Lang.localizedKey(TransitStops.getStopById(stopId), "stopName") +
            //"</small></div>" +
            "            <div>" +
            "                " + gtfs.selectAgencyStopName(agency["agency_id"], Lang.localizedKey(stop, "stop_name")) + " (" + distance + $.i18n("transit-eta-metres") + ")" +
            "            </div>" +
            "        </div>" +
            "        <span class=\"badge badge-primary badge-pill transit-eta\">" + $.i18n("transit-eta-retrieving") + "</span>" +
            "    </li>";
    }
    html += "</ul></div><div class=\"row item-list all-route-list\"></div>";

    $(".content-panel-container").html(html);

    $(".nearby-route-list .route-selection").on("mouseenter", mouseEnterPreviewRoute);

    $(".nearby-route-list .route-selection").on("mouseleave", function () {
        //Map.setCenter(Loc.getCurrentPosition());
        //Map.setZoom(16);
        //Map.removeAllMarkers();
        //Map.removeAllPolylines();
    });

    $(".nearby-route-list .route-selection").on("click", mouseClickSelectRoute);

    filterProviderSort(".nearby-route-list");

    updateEta();
    updateEtaTimer = setInterval(updateEta, 30000);
}

export async function enable() {
    RequestLimiter.clear();
    TransitEta.clearCache();

    TouchKeypad.addListener(touchKeypadListener = function (obj) {
        var searchText;
        if ($(obj).hasClass("touch-keypad-function-done")) {
            hideTouchKeypad();
            adjustMargin();
        } else if ($(obj).hasClass("touch-keypad-function-backspace")) {
            searchText = $("#search-transit-text").val();
            $("#search-transit-text").val(searchText.slice(0, -1));
            searchRoutes();
        } else if ($(obj).hasClass("touch-keypad-value")) {
            var val = $(obj).html();
            searchText = $("#search-transit-text").val();
            $("#search-transit-text").val(searchText + val);
            searchRoutes();
        }
    });

    Event.addListener(Event.EVENTS.EVENT_UI_BACK, eventUiBackListener = function (){
        if (searchMode) {
            TouchKeypad.showTouchKeypad();
        }
        clearInterval(updateStopEtaTimer);
    });

    Event.addListener(Event.EVENTS.EVENT_LOCATION_CHANGE, eventLocChgListener = function () {
        if (lastLat && lastLng) {
            var newLoc = Loc.getCurrentPosition();
            var dst = Misc.geoDistance(newLoc.lat, newLoc.lng, lastLat, lastLng);
            if (dst > 0.125) {
                console.log("Location moved 125 m away. Finding new nearby routes.");
                findNearbyRoutes();
            }
        }
    });

    var agencies = await gtfs.getAgencies();

    if (agencies.length > 0) {
        var buttonScroll =
            "<div class=\"hori-scroll btn-group\">" +
            "    <button type=\"button\" class=\"btn btn-primary gtw-providersort gtw-providersort-all\"><i class=\"fa fa-reply-all\"></i><br />" + $.i18n("transit-eta-sort-all") + "</button>";

        for (var agency of agencies) {
            var image = "fa-bus";
            buttonScroll += " <button type=\"button\" class=\"btn btn-default gtw-providersort gtw-providersort-provider\" data-gtw-package=\"" + agency["package"] + "\" data-gtw-provider=\"" + agency["provider"] + "\" data-gtw-agency=\"" + agency["agency_id"] + "\"><i class=\"fa " + image + "\"></i><br />" + Lang.localizedKey(agency, "agency_name") + "</button>";
        }

        buttonScroll += "</div>";

        $(".tab-panel").append(buttonScroll);

        var searchField =
            "<div class=\"input-group mb-3\" style=\"margin-top: 16px;\">" +
            "    <input type=\"text\" class=\"form-control\" placeholder=\"" + $.i18n("transit-eta-placeholder-search-for-transit") + "\" aria-label=\"" + $.i18n("transit-eta-placeholder-search-for-transit") + "\" aria-describedby=\"search-transit-icon\" id=\"search-transit-text\" readonly/>" +
            "    <div class=\"input-group-append\">" +
            //"        <span class=\"input-group-text\" id=\"search-transit-icon\"><i class=\"fas fa-search\"></i></span>" +
            "        <button class=\"btn btn-light disabled\" type=\"button\" id=\"button-cancel-search\"><i class=\"fas fa-search\"></i></button>" +
            "    </div>" +
            "</div>"
            ;

        $(".tab-panel").append(searchField);

        var requestProgressBar =
            "<div class=\"request-progress-panel\">" +
            "    <div class=\"progress bg-white\">" +
            "        <div class=\"progress-bar progress-bar-striped progress-bar-animated\" role=\"progressbar\" style=\"width: 0%;\"></div>" +
            "    </div>" +
            "</div>"
            ;

        $(".tab-panel").append(requestProgressBar);

        $(".gtw-providersort").on("click", function () {
            if ($(this).hasClass("btn-primary")) {
                return;
            }
            //$(".gtw-providersort").removeClass("btn-default");

            if ($(this).hasClass("gtw-providersort-all")) {
                resetProviderSort();
            } else {
                $(".gtw-providersort").removeClass("btn-primary");

                var pkg = $(this).attr("data-gtw-package");
                var provider = $(this).attr("data-gtw-provider");
                var agency = $(this).attr("data-gtw-agency");
                $(this).addClass("btn-primary");
                
                var cssCond = "[data-gtw-package='" + pkg + "'][data-gtw-provider='" + provider + "'][data-gtw-agency='" + agency + "']";

                $(".gtw-providersort-provider:not(" + cssCond + ")").addClass("btn-default");
                $(".route-selection" + cssCond).attr("style", "");
                $(".route-selection:not(" + cssCond + ")").attr("style", "display: none!important");
            }
        });

        $("#button-cancel-search").on("click", function () {
            if (!$(this).hasClass("disabled")) {
                clearSearch();
            }
        });

        var useKeypad = true;
        if (useKeypad) {
            $("#search-transit-text").on("click", function () {
                showTouchKeypad();
                showSearchRoutes();
            });
        }

        $("#search-transit-text").on("input", function () {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(function () {
                searchRoutes();
            }, 500);
        });

        findNearbyRoutes();
    } else {
        //TODO: better message or auto add plugins according to region
        $(".tab-panel").html("<br /><div class=\"alert alert-danger\" role=\"alert\"><i class=\"fas fa-exclamation-triangle\"></i> " + $.i18n("transit-eta-no-plugins-providing-transit-data") + "</div>");
    }
}

export function disable() {
    TouchKeypad.removeListener(touchKeypadListener);
    Event.removeListener(Event.EVENTS.EVENT_UI_BACK, eventUiBackListener);
    Event.removeListener(Event.EVENTS.EVENT_LOCATION_CHANGE, eventLocChgListener);
    clearTimeout(searchTimeout);
    clearInterval(updateEtaTimer);
    clearInterval(updateStopEtaTimer);
    searchTimeout = false;
    updateEtaTimer = false;
}