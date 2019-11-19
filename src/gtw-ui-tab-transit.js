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
var eventLocSuccessListener;
var eventLocErrorListener;
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
];

var GTFS_CALENDAR_NAMES = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
];

var JS_WEEKDAY_NAMES = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday"
];

function combineCalendars(calendars) {
    var out = {};
    var i;
    for (i = 0; i < GTFS_CALENDAR_IDS.length; i++) {
        out[GTFS_CALENDAR_IDS[i]] = 0;
    }
    var j;
    for (i = 0; i < calendars.length; i++) {
        for (j = 0; j < GTFS_CALENDAR_IDS.length; j++) {
            out[GTFS_CALENDAR_IDS[j]] |= calendars[i][GTFS_CALENDAR_IDS[j]];
        }
    }
    return out;
}

function describeCalendar(calendar, onlyDates = false) {
    if (calendar["monday"] &&
        calendar["tuesday"] &&
        calendar["wednesday"] &&
        calendar["thursday"] &&
        calendar["friday"] &&
        calendar["saturday"] &&
        calendar["sunday"]) {
        if (onlyDates) {
            return $.i18n("transit-calendar-from-monday-to-sunday-dates");
        } else {
            return false;
        }
    } else if (calendar["monday"] &&
        calendar["tuesday"] &&
        calendar["wednesday"] &&
        calendar["thursday"] &&
        calendar["friday"] &&
        calendar["saturday"]) {
        return $.i18n("transit-calendar-from-monday-to-saturday" + (onlyDates ? "-dates" : ""));
    } else if (calendar["monday"] &&
        calendar["tuesday"] &&
        calendar["wednesday"] &&
        calendar["thursday"] &&
        calendar["friday"]) {
        return $.i18n("transit-calendar-from-monday-to-friday" + (onlyDates ? "-dates" : ""));
    } else if (calendar["monday"] &&
        calendar["tuesday"] &&
        calendar["wednesday"] &&
        calendar["thursday"]) {
        return $.i18n("transit-calendar-from-monday-to-thursday" + (onlyDates ? "-dates" : ""));
    } else if (calendar["saturday"] &&
        calendar["sunday"]) {
        return $.i18n("transit-calendar-from-saturday-to-sunday" + (onlyDates ? "-dates" : ""));
    } else if (calendar["saturday"]) {
        return $.i18n("transit-calendar-on-saturday" + (onlyDates ? "-dates" : ""));
    } else if (calendar["sunday"]) {
        return $.i18n("transit-calendar-on-sunday" + (onlyDates ? "-dates" : ""));
    }
    var text = "";
    var i;
    var val;
    for (i = 0; i < GTFS_CALENDAR_IDS.length; i++) {
        val = calendar[GTFS_CALENDAR_IDS[i]];
        if (val) {
            text += GTFS_CALENDAR_NAMES[i].substr(0, 1);
        } else {
            text += ".";
        }
    }
    return text;
}

async function searchRoutes() {
    var overlayFadeInTimeout = setTimeout(function () {
        $(".loading-overlay").fadeIn(500);
    }, 500);
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
        var serviceIds;
        var pathId;
        var pathIds;
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
            pathIds = [];
            serviceIds = [];
            for (j = 0; j < trips.length; j++) {
                trip = trips[j];
                pathId = trip["path_id"];
                serviceId = trip["service_id"];
                if (!pathIds.includes(pathId)) {
                    pathIds.push(pathId);
                }
                if (!serviceIds.includes(serviceId)) {
                    serviceIds.push(serviceId);
                }
            }

            for (j = 0; j < pathIds.length; j++) {
                pathId = pathIds[j];

                html +=
                    "<li class=\"list-group-item list-group-item-action d-flex align-items-center route-selection\"  data-gtw-package=\"" + pkg + "\" data-gtw-provider=\"" + provider + "\" data-gtw-agency=\"" + agencyId + "\" data-gtw-route-id=\"" + route["route_id"] + "\" data-gtw-path-id=\"" + pathId + "\">" +
                    "    <div class=\"d-flex flex-column route-id\">" +
                    "        <div>" + Lang.localizedKey(agency, "agency_short_name") + "</div>" +
                    "        <div>" + routeName + "</div>" +
                    "    </div>" +
                    "    <div class=\"d-flex flex-column stop-info mr-auto\">";

                stopTimes = await gtfs.getStopTimePathByPathId(pkg, provider, pathId);
                lastStop = await gtfs.getStop(pkg, provider, stopTimes[stopTimes.length - 1]["stop_id"]);

                html += "        <div><b>" + $.i18n("transit-eta-to") + ":</b> " + gtfs.selectAgencyStopName(agency["agency_id"], Lang.localizedKey(lastStop, "stop_name")) + "</div>";

                var pathCalendars = [];
                for (k = 0; k < serviceIds.length; k++) {
                    serviceId = serviceIds[k];

                    if (!calendars[serviceId]) {
                        calendars[serviceId] = await gtfs.getCalendar(pkg, provider, serviceId);
                    }
                    pathCalendars.push(calendars[serviceId]);
                }

                html += "<div>";
                //TODO: Calendar Dates

                var hasBadgeBefore = false;

                if (stopTimes[0]["stop_id"] === lastStop["stop_id"]) {
                    hasBadgeBefore = true;
                    html +=
                        "<span class=\"badge badge-secondary\">" +
                        $.i18n("transit-circular-path") +
                        "</span>"
                        ;
                }

                calendar = combineCalendars(pathCalendars);
                var calendarText = describeCalendar(calendar)
                if (calendarText) {
                    if (hasBadgeBefore) {
                        html += " ";
                        hasBadgeBefore = false;
                    }
                    html +=
                        "<span class=\"badge badge-secondary\">" +
                        calendarText +
                        "</span>"
                        ;
                }
                html +=
                    "        </div>" +
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

    clearTimeout(overlayFadeInTimeout);
    $(".loading-overlay").fadeOut(500);
    adjustMargin();
}

function resetProviderSort() {
    $(".gtw-providersort").removeClass("btn-primary");
    $(".gtw-providersort-all").addClass("btn-primary");

    //$(".gtw-providersort-provider").addClass("btn-default");
    $(".route-selection").attr("style", "");
}

function clearSearch() {
    $(".all-route-list").html("");
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

async function mouseClickSelectRoute() {
    //fromSearch = $(this).parent().parent().hasClass("all-route-list");

    var pkg = $(this).attr("data-gtw-package");
    var provider = $(this).attr("data-gtw-provider");
    var agency = $(this).attr("data-gtw-agency");
    var routeId = $(this).attr("data-gtw-route-id");
    var pathId = $(this).attr("data-gtw-path-id");
    var stopId = $(this).attr("data-gtw-stop-id");

    var stopTimes = await gtfs.getStopTimePathByPathId(pkg, provider, pathId);

    if (!stopId && Loc.isLocated()) {
        var pos = Loc.getCurrentPosition();
        
        var pathStop;
        var distance;
        var nearestDistance = false;
        var nearestStop = false;
        for (var stopTime of stopTimes) {
            pathStop = await gtfs.getStop(pkg, provider, stopTime["stop_id"]);
            distance = Misc.geoDistance(pathStop["stop_lat"], pathStop["stop_lon"], pos.lat, pos.lng);
            if (!nearestDistance || !nearestStop || distance < nearestDistance) {
                nearestDistance = distance;
                nearestStop = pathStop;
            }
        }

        console.log(nearestDistance);
        if (nearestDistance <= 2) {
            stopId = nearestStop["stop_id"];
        }
    }

    var overlayFadeInTimeout = setTimeout(function () {
        $(".loading-overlay").fadeIn(500);
    }, 500);
    Map.removeAllMarkers();
    Map.removeAllPolylines();

    await showRouteList(pkg, provider, agency, routeId, pathId, stopId, true, true);

    UI.hidePanel();
    hideTouchKeypad();

    await routeListSelectStop(pkg, provider, agency, routeId, pathId, stopTimes, stopId);
    clearTimeout(overlayFadeInTimeout);
    $(".loading-overlay").fadeOut(500);
}

function mouseEnterPreviewRoute() {
    console.warn("TODO: Preview route");
    /*
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
    */
}

async function showRouteList(pkg, provider, agencyId, routeId, pathId, stopId, scroll = false, draw = false) {
    var stopTimes = await gtfs.getStopTimePathByPathId(pkg, provider, pathId);
    var route = await gtfs.getRoute(pkg, provider, routeId);
    var agency = await gtfs.getAgency(pkg, provider, agencyId);
    var lastStopTime = stopTimes[stopTimes.length - 1];
    var lastStop = await gtfs.getStop(pkg, provider, lastStopTime["stop_id"]);
    var trips = await gtfs.getTripsByRouteId(pkg, provider, routeId);

    var freqByService = {};
    var obj;
    var freqs;
    var tripId;
    var serviceId;
    var exist;
    for (i = 0; i < trips.length; i++) {
        if (pathId !== trips[i]["path_id"]) {
            continue;
        }

        tripId = trips[i]["trip_id"];
        serviceId = trips[i]["service_id"];
        if (!freqByService[serviceId]) {
            freqByService[serviceId] = {
                calendar: await gtfs.getCalendar(pkg, provider, serviceId),
                freqs: []
            };
        }
        obj = freqByService[serviceId];
        freqs = await gtfs.getFrequencies(pkg, provider, tripId);
        for (var freq of freqs) {
            exist = false;
            for (var savedFreq of obj.freqs) {
                if (savedFreq["start_time"] === freq["start_time"] &&
                    savedFreq["end_time"] === freq["end_time"] &&
                    savedFreq["headway_secs"] === freq["headway_secs"]) {
                    exist = true;
                    break;
                }
            }
            if (!exist) {
                obj.freqs.push(freq);
            }
        }
    }

    //Header

    var html =
        "<ul class=\"list-group\"><li class=\"list-group-item d-flex align-items-center route-selection\">" +
        "    <div class=\"d-flex flex-column route-id\">" +
        "        <div>" + Lang.localizedKey(agency, "agency_short_name") + "</div>" +
        "        <div>" + Lang.localizedKey(route, "route_short_name") + "</div>" +
        "    </div>" +
        "    <div class=\"d-flex flex-column stop-info mr-auto\">" +
        "        <div><b>" + $.i18n("transit-eta-to") + ":</b> " + gtfs.selectAgencyStopName(agencyId, Lang.localizedKey(lastStop, "stop_name")) + "</div><div>";

    var hasBadgeBefore = false;

    if (stopTimes[0]["stop_id"] === lastStop["stop_id"]) {
        hasBadgeBefore = true;
        html +=
            "<span class=\"badge badge-secondary\">" +
            $.i18n("transit-circular-path") +
            "</span>"
            ;
    }

    var pathCalendars = [];
    for (var serviceId in freqByService) {
        pathCalendars.push(freqByService[serviceId].calendar);
    }

    var calendar = combineCalendars(pathCalendars);
    var calendarText = describeCalendar(calendar)
    if (calendarText) {
        if (hasBadgeBefore) {
            html += " ";
            hasBadgeBefore = false;
        }
        html +=
            "<span class=\"badge badge-secondary\">" +
            calendarText +
            "</span>"
            ;
    }

    html +=
        "</div></div></li></ul>" +
        "<ul class=\"nav nav-pills nav-fill m-2\" role=\"tablist\" id=\"pills-route-list-tab\">" +
        "    <li class=\"nav-item\">" +
        "        <a class=\"nav-link active\" id=\"pills-route-tab\" data-toggle=\"pill\" href=\"#pills-route\" role=\"tab\" aria-controls=\"pills-route\" aria-selected=\"true\">" + $.i18n("transit-route-tab-route-list") + "</a>" +
        "    </li>" +
        "    <li class=\"nav-item\">" +
        "        <a class=\"nav-link\" id=\"pills-timetable-tab\" data-toggle=\"pill\" href=\"#pills-timetable\" role=\"tab\" aria-controls=\"pills-timetable\" aria-selected=\"false\">" + $.i18n("transit-route-tab-timetable") + "</a>" +
        "    </li>" +
        "    <li class=\"nav-item\">" +
        "        <a class=\"nav-link disabled\" id=\"pills-other-routes-tab\" data-toggle=\"pill\" href=\"#pills-other-routes\" role=\"tab\" aria-controls=\"pills-other-routes\" aria-selected=\"false\">" + $.i18n("transit-route-tab-other-routes") + "</a>" +
        "    </li>" +
        "</ul>"
        ;
    $(".half-map-tab-panel").html(html);

    //Route Tab

    html =
        "<div class=\"tab-content\" id=\"pills-route-list-tabContent\">" +
        "    <div class=\"tab-pane fade show active\" id=\"pills-route\" role=\"tabpanel\" aria-labelledby=\"pills-route-tab\">" +
        "        <div class=\"row\" style=\"padding: 2%;\">" +
        "            <div class=\"timeline-centered\">"
        ;
    var i;
    var stop;
    for (i = 0; i < stopTimes.length; i++) {
        //TODO: Fare attributes and rules
        stop = await gtfs.getStop(pkg, provider, stopTimes[i]["stop_id"]);
        html +=
            "<article class=\"timeline-entry\" data-gtw-package=\"" + pkg + "\" data-gtw-provider=\"" + provider + "\" data-gtw-agency=\"" + agencyId + "\" data-gtw-route-id=\"" + routeId + "\" data-gtw-path-id=\"" + pathId + "\" data-gtw-stop-id=\"" + stop["stop_id"] + "\">" +
            "    <div class=\"timeline-entry-inner\">" +
            "        <div class=\"timeline-icon bg-light\">" +
            "            " + (i + 1) +
            "        </div>" +
            "        <div class=\"timeline-label\">" +
            "            <h2><button style=\"padding: 0px;\" class=\"btn btn-link\" data-gtw-package=\"" + pkg + "\" data-gtw-provider=\"" + provider + "\" data-gtw-agency=\"" + agencyId + "\" data-gtw-route-id=\"" + routeId + "\" data-gtw-path-id=\"" + pathId + "\" data-gtw-stop-id=\"" + stop["stop_id"] + "\" data-gtw-stop-sequence=\"" + stopTimes[i]["stop_sequence"] + "\" data-gtw-stop-index=\"" + i + "\">" + gtfs.selectAgencyStopName(agencyId, Lang.localizedKey(stop, "stop_name")) + "</button></h2>" +
            "            <p></p>" +
            "        </div>" +
            "    </div>" +
            "</article>"
            ;
    }
    html +=
        "            </div>" +
        "        </div>" +
        "    </div>" +
        "    <div class=\"tab-pane fade\" id=\"pills-timetable\" role=\"tabpanel\" aria-labelledby=\"pills-timetable-tab\">";

    //Timetable Tab

    var tabs = "<ul class=\"nav nav-pills nav-fill mb-3\" id=\"calendar-tab\" role=\"tablist\">";
    var tabContent = "<div class=\"tab-content\" id=\"calendar-tabContent\">";
    var calendarDesc;

    var date = new Date();
    var isCurrentService = {};
    var hasCurrent = false;
    for (var serviceId in freqByService) {
        var currentService = freqByService[serviceId].calendar[JS_WEEKDAY_NAMES[date.getDay()]] === 1;
        isCurrentService[serviceId] = currentService;
        hasCurrent |= currentService;
    }

    var i = 0;
    for (var serviceId in freqByService) {
        obj = freqByService[serviceId];
        calendarDesc = describeCalendar(obj.calendar, true);

        var active;
        var current;
        if (hasCurrent) {
            current = isCurrentService[serviceId];
            active = current;
        } else {
            current = false;
            active = i === 0;
        }

        tabs +=
            "<li class=\"nav-item\">" +
            "    <a class=\"nav-link" + (active ? " active" : "") + "\" id=\"calendar-" + serviceId + "-tab\" data-toggle=\"pill\" href=\"#calendar-" + serviceId + "\" role=\"tab\" aria-controls=\"calendar-" + serviceId + "\" aria-selected=\"" + (active ? "true" : "false") + "\">" + (current ? "<i class=\"fas fa-hourglass-half\"></i> " : "") + calendarDesc + "</a>" +
            "</li>"
            ;
        tabContent +=
            "<div class=\"tab-pane fade" + (active ? " show active" : "") + "\" id=\"calendar-" + serviceId + "\" role=\"tabpanel\" aria-labelledby=\"calendar-" + serviceId + "-tab\">" +
            "    <table class=\"table\">" +
            "        <thead class=\"thead-light\">" +
            "            <tr>" +
            "                <th scope=\"col\" colspan=\"" + (current && hasCurrent ? "4" : "3") + "\">" + $.i18n("transit-calendar-header-timeslot") + "</th>" +
            "                <th scope=\"col\">" + $.i18n("transit-calendar-header-headway-min") + "</th>" +
            "            </tr>" +
            "        </thead>" +
            "        <tbody>";
        i++;

        if (obj.freqs.length > 0) {
            for (var freq of obj.freqs) {
                var min = Math.round(freq["headway_secs"] / 60);
                tabContent +=
                    "            <tr>";

                if (current && hasCurrent) {
                    if (gtfs.isCurrentFrequency(freq)) {
                        tabContent +=
                            "                <td><i class=\"fas fa-hourglass-half\"></i></td>";
                    } else {
                        tabContent +=
                            "                <td></td>";
                    }
                }

                tabContent +=
                    "                <td>" + freq["start_time"] + "</td>" +
                    "                <td>-</td>" +
                    "                <td>" + freq["end_time"] + "</td>" +
                    "                <td>" + min + "</td>" +
                    "            </tr>";
            }
        } else {
            tabContent +=
                "                <td colspan=\"4\">" + $.i18n("transit-eta-no-timetable") + "</td>" +
                "            </tr>";
        }

        tabContent +=
            "        </tbody>" +
            "    </table>" +
            "</div>";
    }
    tabs += "</ul>";

    html +=
        tabs + tabContent +
        "    </div>" +
        "    <div class=\"tab-pane fade\" id=\"pills-other-routes\" role=\"tabpanel\" aria-labelledby=\"pills-other-routes-tab\">";

    //Other routes tab

    html +=
        "</div>" +
        "</div>"
        ;
    $(".half-map-container").html(html);

    $(".half-map-container button").on("click", function () {
        var pkg = $(this).attr("data-gtw-package");
        var provider = $(this).attr("data-gtw-provider");
        var agencyId = $(this).attr("data-gtw-agency");
        var routeId = $(this).attr("data-gtw-route-id");
        var pathId = $(this).attr("data-gtw-path-id");
        var stopId = $(this).attr("data-gtw-stop-id");
        routeListSelectStop(pkg, provider, agencyId, routeId, pathId, stopTimes, stopId);
    });

    //I don't know why Bootstrap's tab is not working... custom JS code
    $(".nav-pills[role='tablist'] .nav-item a").on("click", function () {
        var thisId = $(this).parent().parent().attr("id");
        var index = thisId.lastIndexOf("-tab");
        var newStr = thisId.substr(0, index) + "-tabContent";
        var con = $(this).attr("aria-controls");
        $(".tab-content[id='" + newStr + "']").children(".tab-pane").each(function () {
            var elId = $(this).attr("id");
            if (elId !== con) {
                $(this).removeClass("show");
                $(this).removeClass("active");
            } else {
                $(this).addClass("show");
                $(this).addClass("active");
                if (!elId.startsWith("calendar-")) {
                    $(this)[0].scrollIntoView();
                }
            }
        });
    });

    if (draw) {
        await drawTripOnMap(stopTimes);
    }

    adjustMargin();
}

async function routeListSelectStop(pkg, provider, agencyId, routeId, pathId, stopTimes, stopId) {
    var parent = screen.width >= 768 ? ".desktop" : ".mobile";

    var node = $(parent + " .timeline-entry[data-gtw-stop-id='" + stopId + "']");
    var notNode = $(parent + " .timeline-entry:not([data-gtw-stop-id='" + stopId + "'])");

    var icon = node.children(".timeline-entry-inner").children(".timeline-icon");
    var notIcon = node.children(".timeline-entry-inner").children(".timeline-icon");

    icon.removeClass("bg-light");
    icon.addClass("bg-primary");

    notIcon.addClass("bg-light");
    notIcon.removeClass("bg-primary");

    //var nodeP = node.children(".timeline-entry-inner").children(".timeline-label").children("p");
    var notNodeP = notNode.children(".timeline-entry-inner").children(".timeline-label").children("p");

    notNodeP.html("");

    if (scroll) {
        var scrollNode = node[0];
        if (scrollNode === undefined) {
            scrollNode = $(parent + " .timeline-entry")[0];
        }
        scrollNode.scrollIntoView();
    }

    if (stopId) {
        var agency = await gtfs.getAgency(pkg, provider, agencyId);
        var route = await gtfs.getRoute(pkg, provider, routeId);
        var trip = await gtfs.getCurrentTrip(pkg, provider, route["route_id"]);
        var stop = await gtfs.getStop(pkg, provider, stopId);

        var targetPos = { lat: stop["stop_lat"], lng: stop["stop_lon"] };

        Map.setCenter(targetPos);
        Map.setZoom(18);

        showStopEta(agency, route, trip, stopTimes, stop);
    }
}

var realtimeShown;

async function showGtfsStaticFrequencies(pkg, provider, routeId, stopId, pathId) {
    var tableNode = $(".timeline-entry[data-gtw-stop-id='" + stopId + "'] p table tbody");

    var freqs = await gtfs.getRoutePathFrequencies(pkg, provider, routeId, pathId);

    var currFreq = -1;
    var i;
    for (i = 0; i < freqs.length; i++) {
        if (gtfs.isCurrentFrequency(freqs[i])) {
            currFreq = i;
            break;
        }
    }

    var content = "";
    if (currFreq !== -1) {
        var len = currFreq + 3 >= freqs.length ? freqs.length : currFreq + 3;
        for (var i = currFreq; i < len; i++) {
            var min = Math.round(freqs[i]["headway_secs"] / 60);

            var time = gtfs.timeToDate(freqs[i]["start_time"]);

            content +=
                "<tr class=\"table-secondary" + (i == currFreq ? " active" : "") + "\">" +
                "    <td>" + $.i18n("transit-eta-every-minutes", min) + "</td>" +
                "    <td colspan=\"2\">" + Misc.fillZero(time.getHours()) + ":" + Misc.fillZero(time.getMinutes()) + "</td>" +
                "</tr>";
        }
    } else if (freqs.length === 0) {
        content +=
            "<tr class=\"table-dark\">" +
            "    <td colspan=\"4\">" + $.i18n("transit-eta-no-timetable") + "</td>" +
            "</tr>";
    } else {
        content +=
            "<tr class=\"table-dark\">" +
            "    <td colspan=\"4\">" + $.i18n("transit-eta-not-in-service") + "</td>" +
            "</tr>";
    }

    if (!realtimeShown) {
        tableNode.html(content);
    }
}

async function updateStopEta(agency, route, trip, stopTimes, stop) {
    $(".eta-loading-spinner").css("display", "");
    try {
        var returned = await TransitEta.fetchEta({
            etaProviders: agency["agency_id"].split("+"),
            agency: agency,
            route: route,
            trip: trip,
            stopTimes: stopTimes,
            stop: stop
        });
        $(".stop-eta-msg").remove();
        $(".eta-loading-spinner").css("display", "none");
        console.log(returned);
        var opt = returned.options;
        var content = "";
        var node = $(".timeline-entry[data-gtw-stop-id='" + opt.stop["stop_id"] + "'] p table tbody");
        if (returned.code === -2) {
            var html = "<p class=\"stop-eta-msg\">*" + $.i18n("transit-eta-no-eta-providers") + "</p>";
            ;
            $(".timeline-entry[data-gtw-stop-id='" + opt.stop["stop_id"] + "'] p").append(html);
        } else if (returned.code === -1 || (returned.feeds && returned.feeds.length === 0)) {
            var html = "<p class=\"stop-eta-msg\">*" + $.i18n("transit-eta-no-data-received") + "</p>";
            ;
            $(".timeline-entry[data-gtw-stop-id='" + opt.stop["stop_id"] + "'] p").append(html);
        } else {
            var alerts = [];
            var pairs = [];
            for (var feed of returned.feeds) {
                for (var entity of feed.entity) {
                    var tripUpdate = entity["tripUpdate"];
                    if (tripUpdate) {
                        var timestamp = tripUpdate.timestamp ? tripUpdate.timestamp : feed.header.timestamp;
                        pairs.push({
                            timestamp: timestamp,
                            entity: entity
                        });
                    }

                    if (entity["alert"]) {
                        alerts.push(entity["alert"]);
                    }
                }
            }

            if (alerts.length > 0) {
                var alertsHtml = "";
                if (alerts.length === 1) {
                    alertsHtml =
                        "<div class=\"stop-eta-msg alert alert-warning\"><i class=\"fas fa-exclamation-triangle\"></i> <b>" + Lang.translatedString(alerts[0].headerText) + "</b></div>";
                } else {
                    alertsHtml =
                        "<div class=\"stop-eta-msg alert alert-warning\"><i class=\"fas fa-exclamation-triangle\"></i> <b>" + $.i18n("transit-eta-alerts-affecting-stop", alerts.length) + "</b> <button class=\"btn btn-link view-alert-btn\">" + $.i18n("transit-eta-view-alerts-affecting-stop") + "</button></div>";
                }
                $(".timeline-entry[data-gtw-stop-id='" + opt.stop["stop_id"] + "'] p").prepend(alertsHtml);
                $(".view-alert-btn").on("click", function () {
                    UI.showModal("viewgtfsalerts", alerts);
                });
            }

            if (pairs.length === 0) {
                var html = "<p>*" + $.i18n("transit-eta-no-schedules-pending") + "</p>";
                ;
                $(".timeline-entry[data-gtw-stop-id='" + opt.stop["stop_id"] + "'] p").append(html);
            } else {
                var content = "";

                var active = false;
                for (var pair of pairs) {
                    var stopTimeUpdates = pair.entity.tripUpdate["stopTimeUpdate"];
                    if (stopTimeUpdates && stopTimeUpdates.length > 0) {
                        for (var stopTimeUpdate of stopTimeUpdates) {
                            if (!stopTimeUpdate["scheduleRelationship"] || stopTimeUpdate["scheduleRelationship"] === "SCHEDULED") {
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

                                if (pair.entity["vehicle"] && pair.entity["vehicle"]["vehicle"] && pair.entity["vehicle"]["vehicle"]["label"]) {
                                    html += "<td>" + pair.entity["vehicle"]["vehicle"]["label"] + "</td>";
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

                $(".timeline-entry[data-gtw-stop-id='" + opt.stop["stop_id"] + "'] p table tbody").html(content);
                realtimeShown = true;
            }
        }
    } catch (options) {
        $(".eta-loading-spinner").css("display", "none");
        var html = "<p class=\"text-danger\">*" + $.i18n("transit-eta-error-fetching-eta") + "</p>";
        ;
        $(".timeline-entry[data-gtw-stop-id='" + stop["stop_id"] + "'] p").append(html);
        //var node = $(".timeline-entry[data-gtw-stop-id='" + options.stop["stop_id"] + "'] p table tbody");
        //node.html("<tr class=\"table-danger\"><td colspan=\"4\">" + $.i18n("transit-eta-error-fetching-eta") + "</td></tr>");
    }
}

async function showStopEta(agency, route, trip, stopTimes, stop) {
    var node = $(".timeline-entry[data-gtw-stop-id='" + stop["stop_id"] + "'] p");

    var content =
        "<u>" + $.i18n("transit-eta") + "</u> <div class=\"spinner-border spinner-border-sm eta-loading-spinner\" role=\"status\"></div>" +
        "<table class=\"table stop-eta\">" +
        "    <tr class=\"table-dark\">" +
        "        <td colspan=\"4\"><div class=\"spinner-border spinner-border-sm\" role=\"status\"></div> " + $.i18n("transit-eta-retrieving-data") + "</td>" +
        "    </tr>" +
        "</table>";
    node.html(content);

    //
    // GTFS-static freqencies
    //

    realtimeShown = false;
    showGtfsStaticFrequencies(route["package"], route["provider"], route["route_id"], stop["stop_id"], stopTimes[0]["path_id"]);

    //
    // GTFS Realtime data
    //

    clearInterval(updateStopEtaTimer);
    var func = function () {
        updateStopEta(agency, route, trip, stopTimes, stop);
    };
    func();
    updateStopEtaTimer = setInterval(func, 30000);
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
            stop: result.stop,
            stopTimes: result.path
        });
        p.then(function (returned) {
            var text = "";
            var opt = returned.options;

            var node = $(".nearby-route-list .route-selection[data-gtw-package=\"" + opt.agency["package"] + "\"][data-gtw-provider=\"" + opt.agency["provider"] + "\"][data-gtw-agency=\"" + opt.agency["agency_id"] + "\"][data-gtw-route-id=\"" + opt.route["route_id"] + "\"][data-gtw-path-id=\"" + opt.trip["path_id"] + "\"][data-gtw-stop-id=\"" + opt.stop["stop_id"] + "\"]");

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
                        var tripUpdate = entity["tripUpdate"];
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

                    var stopTimeUpdates = pair.tripUpdate["stopTimeUpdate"];
                    if (stopTimeUpdates && stopTimeUpdates.length > 0) {
                        var stopTimeUpdate = stopTimeUpdates[0];

                        if (!stopTimeUpdate["scheduleRelationship"] || stopTimeUpdate["scheduleRelationship"] === "SCHEDULED") {
                            var etaTime;
                            //TODO: Calculate non-absolute time from trips
                            if (stopTimeUpdate.departure) {
                                etaTime = stopTimeUpdate.departure.time;
                            } else if (stopTimeUpdate.arrival) {
                                etaTime = stopTimeUpdate.arrival.time;
                            }

                            //TODO: uncertainty

                            var calcEta = Math.floor((etaTime - pair.timestamp) / 1000 / 60);

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

            badge.removeClass("badge-primary");
            badge.removeClass("badge-secondary");
            badge.removeClass("badge-warning");
            badge.removeClass("badge-danger");
            badge.removeClass("badge-dark");
            badge.addClass(badgeClass);

            badge.html(text);
        }).catch(function (options, err) {
            var node = $(".nearby-route-list .route-selection[data-gtw-package=\"" + options.agency["package"] + "\"][data-gtw-provider=\"" + options.agency["provider"] + "\"][data-gtw-agency=\""  + options.agency["agency_id"] + "\"][data-gtw-route-id=\"" + options.route["route_id"] + "\"][data-gtw-path-id=\"" + options.trip["path_id"] + "\"][data-gtw-stop-id=\"" + options.stop["stop_id"] + "\"]");

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
                $.i18n("transit-eta-no-routes-found-10-km") +
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

        var stopRoutes = await gtfs.searchStopRoutes(pkg, provider, stop["stop_id"]);

        //TODO: seperate trips
        for (var routeId in stopRoutes.trips) {
            var trip = stopRoutes.trips[routeId];
            var agency = await gtfs.getAgency(pkg, provider, stopRoutes.routes[routeId]["agency_id"]);
            var path = await gtfs.getStopTimePathByPathId(pkg, provider, trip["path_id"]);
            allNearbyRoutes.push({
                agency: agency,
                route: stopRoutes.routes[routeId],
                trip: trip,
                stop: stop,
                stopTime: stopRoutes.stopTimes[trip["path_id"]],
                path: path,
                distance: stopResult.distance
            });
        }
    }

    console.log(allNearbyRoutes);

    var distance;
    //var paths;
    //var stopId;

    var stop;
    var agency;
    var html = "<ul class=\"list-group\">";
    for (var result of allNearbyRoutes) {
        //paths = result.route.paths[result.bound];
        //stopId = paths[paths.length - 1];

        distance = Math.round(result.distance * 1000);
        agency = await gtfs.getAgency(result.route["package"], result.route["provider"], result.route["agency_id"]);
        stop = await gtfs.getStop(result.stopTime["package"], result.stopTime["provider"], result.stopTime["stop_id"]);

        html +=
            "    <li class=\"list-group-item list-group-item-action d-flex justify-content-between align-items-center route-selection\" data-gtw-package=\"" + result.route["package"] + "\" data-gtw-provider=\"" + result.route["provider"] + "\" data-gtw-agency=\"" + result.route["agency_id"] + "\" data-gtw-route-id=\"" + result.route["route_id"] + "\" data-gtw-path-id=\"" + result.trip["path_id"] + "\" data-gtw-stop-id=\"" + result.stopTime["stop_id"] + "\" data-gtw-stop-seq=\"" + result.stopTime["stop_sequence"] + "\">" +
            "        <div class=\"d-flex flex-column route-id\">" +
            "            <div>" + Lang.localizedKey(agency, "agency_short_name") + "</div>" +
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
    html += "</ul>";

    $(".nearby-route-list").html(html);

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

function nearbyRoutesLocSuccess() {
    var html =
        "<div class=\"d-flex justify-content-center w-100\">" +
        "    <div class=\"text-center\">" +
        "        <div class=\"spinner-grow m-5\" style=\"width: 3rem; height: 3rem;\"></div>" +
        "        <div>" + $.i18n("transit-searching-nearby-routes") + "</div>" +
        "    </div>" +
        "</div>";
    ;
    $(".nearby-route-list").html(html);
    findNearbyRoutes();
}

function nearbyRoutesLocError(error) {
    var errorText;
    console.log(error);
    if (error.code === 1) {
        errorText = $.i18n("location-error-user-denied-location");
    } else if (error.code === 2 || error.code === 3) {
        errorText = $.i18n("location-error-could-not-get-location");
    } else {
        errorText = $.i18n("location-error-unknown", error.message);
    }

    var html =
        "<div class=\"d-flex justify-content-center w-100\">" +
        "    <div class=\"text-center text-dark\">" +
        "        <i class=\"fas fa-exclamation-triangle m-5\" style=\"width: 3rem; height: 3rem;\"></i>" +
        "        <div class=\"ml-3 mr-3\">" + errorText + "</div>" +
        "    </div>" +
        "</div>";
    ;
    $(".nearby-route-list").html(html);
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

    Event.addListener(Event.EVENTS.EVENT_LOCATION_ERROR, eventLocErrorListener = function (error) {
        nearbyRoutesLocError(error);
    });

    Event.addListener(Event.EVENTS.EVENT_LOCATION_SUCCESS, eventLocSuccessListener = function () {
        nearbyRoutesLocSuccess();
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
            buttonScroll += " <button type=\"button\" class=\"btn btn-default gtw-providersort gtw-providersort-provider\" data-gtw-package=\"" + agency["package"] + "\" data-gtw-provider=\"" + agency["provider"] + "\" data-gtw-agency=\"" + agency["agency_id"] + "\"><i class=\"fa " + image + "\"></i><br />" + Lang.localizedKey(agency, "agency_short_name") + "</button>";
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

        var contentHtml = "<div class=\"row item-list nearby-route-list\"></div><div class=\"row item-list all-route-list\"></div>";
        $(".content-panel-container").html(contentHtml);

        if (Loc.isErrored()) {
            nearbyRoutesLocError(Loc.getError());
        } else if (Loc.isLocated()) {
            nearbyRoutesLocSuccess();
        } else {
            var html =
                "<div class=\"d-flex justify-content-center w-100\">" +
                "    <div class=\"text-center\">" +
                "        <div class=\"spinner-grow m-5\" style=\"width: 3rem; height: 3rem;\"></div>" +
                "        <div>" + $.i18n("transit-locating-your-location") + "</div>" +
                "    </div>" +
                "</div>";
            ;
            $(".nearby-route-list").html(html);
        }
    } else {
        //TODO: better message or auto add plugins according to region
        $(".tab-panel").html("<br /><div class=\"alert alert-danger\" role=\"alert\"><i class=\"fas fa-exclamation-triangle\"></i> " + $.i18n("transit-eta-no-plugins-providing-transit-data") + "</div>");
    }
}

export function disable() {
    TouchKeypad.removeListener(touchKeypadListener);
    Event.removeListener(Event.EVENTS.EVENT_UI_BACK, eventUiBackListener);
    Event.removeListener(Event.EVENTS.EVENT_LOCATION_ERROR, eventLocErrorListener);
    Event.removeListener(Event.EVENTS.EVENT_LOCATION_SUCCESS, eventLocSuccessListener);
    Event.removeListener(Event.EVENTS.EVENT_LOCATION_CHANGE, eventLocChgListener);
    clearTimeout(searchTimeout);
    clearInterval(updateEtaTimer);
    clearInterval(updateStopEtaTimer);
    searchTimeout = false;
    updateEtaTimer = false;
}