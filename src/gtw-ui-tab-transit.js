import * as Transit from './gtw-citydata-transit';
import * as TransitGtfs from './gtw-citydata-transit-gtfs';
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
        var provider = $(this).attr("gtw-provider");
        var contain = $(listNodeCss + " .route-selection[gtw-provider='" + provider + "']").length > 0;
        if (contain) {
            $(this).css("display", "");
        } else {
            $(this).css("display", "none");
        }
    });
}

function searchRoutes() {
    var val = $("#search-transit-text").val();
    var useKeypad = true;
    if (!useKeypad) {
        clearSearch();
        return;
    }

    var routes = TransitRoutes.getAllRoutes();

    var len = val.length;

    var foundList = [];

    var i;
    var provider;
    var route;
    var path;
    var lastStop;
    var doNotShow = false;

    var t;
    if (len === 0) {
        doNotShow = true;
        console.log("No query input.");
        t = Date.now();
        var stopId;
        for (var route of routes) {
            provider = TransitRoutes.getProvider(route.provider);
            for (i = 0; i < route.paths.length; i++) {
                path = route.paths[i];
                stopId = path[path.length - 1];
                lastStop = TransitStops.getStopById(stopId);
                foundList.push({
                    provider: provider,
                    route: route,
                    lastStop: lastStop,
                    bound: i
                });
            }
        }
        console.log("AllRoutesArrayBuild used " + (Date.now() - t) + " ms");
    } else {
        t = Date.now();
        var j;
        var indexesList = [];
        for (i = 0; i < routes.length; i++) {
            routeName = Lang.localizedKey(routes[i], "routeName");
            if (routeName.length >= len) {
                for (j = 0; j < routes[i].paths.length; j++) {
                    indexesList.push({
                        value: routeName.substr(0, len),
                        routeIndex: i,
                        pathIndex: j
                    });
                }
            }
        }
        console.log("SearchRoutesArrayBuild used " + (Date.now() - t) + " ms");

        t = Date.now();
        indexesList.sort(function (a, b) {
            return a.value.localeCompare(b.value);//Misc.stringCompare(a.value, b.value);
        });
        console.log("SortArray used " + (Date.now() - t) + " ms");

        var mid;
        var midVal;
        var compare;
        var start = 0;
        var end = indexesList.length - 1;

        t = Date.now();
        while (start < end) {
            mid = Math.floor((start + end) / 2);
            midVal = indexesList[mid];
            compare = val.localeCompare(midVal.value);//Misc.stringCompare(val, midVal.value);

            if (compare === 0) {
                end = mid;
            } else if (compare > 0) {
                start = mid + 1;
            } else {
                end = mid - 1;
            }
        }
        console.log("Search used " + (Date.now() - t) + " ms");

        var u;
        if (indexesList[start].value === val) {
            t = Date.now();
            var index;
            for (i = start; i < indexesList.length; i++) {
                index = indexesList[i];

                if (index.value !== val) {
                    break;
                }

                route = routes[index.routeIndex];
                provider = TransitRoutes.getProvider(route.provider);
                path = route.paths[index.pathIndex];
                lastStop = TransitStops.getStopById(path[path.length - 1]);
                
                foundList.push({
                    provider: provider,
                    route: routes[index.routeIndex],
                    lastStop: lastStop,
                    bound: index.pathIndex
                });
            }
            console.log("Found list build used " + (Date.now() - t) + " ms");
        }
    }

    var html = "<ul class=\"list-group\">";

    t = Date.now();
    var routeName;
    var availableKeypads = {};
    for (i = 0; i < foundList.length; i++) {
        routeName = Lang.localizedKey(foundList[i].route, "routeName");

        if (val.length < routeName.length) {
            var letter = routeName.charAt(val.length);
            availableKeypads[letter] = true;
        }

        if (!doNotShow) {
            html +=
                "<li class=\"list-group-item list-group-item-action d-flex align-items-center route-selection\" gtw-provider=\"" + foundList[i].provider.id + "\" gtw-route-id=\"" + foundList[i].route.routeId + "\" gtw-bound=\"" + foundList[i].bound + "\">" +
                "    <div class=\"d-flex flex-column route-id\">" +
                "        <div>" + Lang.localizedKey(foundList[i].provider, "name") + "</div>" +
                "        <div>" + routeName + "</div>" +
                "    </div>" +
                "    <div><b>" + $.i18n("transit-eta-to") + ":</b> " + Lang.localizedKey(foundList[i].lastStop, "stopName") + "</div>" +
                "</li>";
        }
    }
    console.log("HTML build used " + (Date.now() - t) + " ms");

    html += "</ul>";
    $(".all-route-list").html(html);

    TouchKeypad.setEnabled(availableKeypads);

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

window.t = TransitStops;

function drawRouteOnMap(route, bound) {
    var path = route.paths[bound];

    var coords = [];
    var pos;
    var dbStop;
    var i;
    for (i = 0; i < path.length; i++) {
        dbStop = TransitStops.getStopById(path[i]);
        pos = { lat: dbStop.lat, lng: dbStop.lng };
        coords.push(pos);
        Map.addMarker(pos, {
            title: dbStop.stopName,
            label: "" + (i + 1)
        });
    }
    Map.addPolyline(coords, "#FF0000", 2);
}

function mouseClickSelectRoute() {
    //fromSearch = $(this).parent().parent().hasClass("all-route-list");

    UI.hidePanel();
    hideTouchKeypad();

    Map.removeAllMarkers();
    Map.removeAllPolylines();

    var provider = TransitRoutes.getProvider($(this).attr("gtw-provider"));
    var route = provider.getRouteById($(this).attr("gtw-route-id"));
    var stop = TransitStops.getStopById($(this).attr("gtw-stop-id"));
    var bound = $(this).attr("gtw-bound");

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

    showRouteList(route, bound, stop, true);
    drawRouteOnMap(route, bound);
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

function showRouteList(route, bound, stop = false, scroll = false) {
    var html = "<div class=\"row\" style=\"padding: 2%;\"><div class=\"timeline-centered\">";
    var path = route.paths[bound];
    var dbStop;
    var i;
    for (i = 0; i < path.length; i++) {
        dbStop = TransitStops.getStopById(path[i]);
        html +=
            "<article class=\"timeline-entry\" stop-id=\"" + dbStop.stopId + "\" stop-index=\"" + i + "\">" +
            "    <div class=\"timeline-entry-inner\">" +
            "        <div class=\"timeline-icon bg-light\">" +
            "            " + (i + 1) +
            "        </div>" +
            "        <div class=\"timeline-label\">" +
            "            <h2><button style=\"padding: 0px;\" class=\"btn btn-link\" stop-id=\"" + dbStop.stopId + "\">" + Lang.localizedKey(dbStop, "stopName") + "</button></h2>" +
            "            <p></p>" +
            "        </div>" +
            "    </div>" +
            "</article>"
            ;
    }
    html += "</div></div>";
    $(".half-map-container").html(html);

    $(".half-map-container button").on("click", function () {
        var x = TransitStops.getStopById($(this).attr("stop-id"));
        if (x) {
            showRouteList(route, bound, x);
        }
    });

    var provider = TransitRoutes.getProvider(route.provider);
    var lastStopId = path[path.length - 1];
    html =
        "<ul class=\"list-group\"><li class=\"list-group-item d-flex align-items-center route-selection\">" +
        "    <div class=\"d-flex flex-column route-id\">" +
        "        <div>" + Lang.localizedKey(provider, "name") + "</div>" +
        "        <div>" + Lang.localizedKey(route, "routeName") + "</div>" +
        "    </div>" +
        "    <div><b>" + $.i18n("transit-eta-to") + ":</b> " + Lang.localizedKey(TransitStops.getStopById(lastStopId), "stopName") + "</div>" +
        "</li></ul>"
        ;
    $(".half-map-tab-panel").html(html);

    adjustMargin();
    if (stop) {
        var parent = screen.width >= 768 ? ".desktop" : ".mobile";

        var node = $(parent + " .timeline-entry[stop-id='" + stop.stopId + "']");

        var icon = node.children().children(".timeline-icon");
        icon.removeClass("bg-light");
        icon.addClass("bg-primary");

        if (scroll) {
            node[0].scrollIntoView();
        }

        var targetPos = { lat: stop.lat, lng: stop.lng };

        Map.setCenter(targetPos);
        Map.setZoom(18);

        clearInterval(updateStopEtaTimer);
        var func = function () {
            showStopEta(route, bound, stop);
        };
        func();
        updateStopEtaTimer = setInterval(func, 30000);
    }
}

function showStopEta(route, bound, stop) {
    var node = $(".timeline-entry[stop-id='" + stop.stopId + "'] p");

    var content =
        "<p><u>" + $.i18n("transit-eta") + "</u></p>" +
        "<table class=\"table stop-eta\">"
        ;

    var p = TransitEta.fetchEta({
        provider: route.provider,
        etaProviders: route.etaProviders,
        routeId: route.routeId,
        selectedPath: parseInt(bound),
        stopId: stop.stopId
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
        p.then(function (data) {
            var h = data.options;
            var content = "";
            var node = $(".timeline-entry[stop-id='" + h.stopId + "'] p table tbody");
            if (data.code && data.code === -2) {
                content +=
                    "<tr class=\"table-dark\">" +
                    "    <td colspan=\"4\">" + $.i18n("transit-eta-no-eta-providers") + "</td>" +
                    //"    <td>---</td>" +
                    "</tr>"
                    ;
            } else if (!data.schedules || data.code && data.code === -1) {
                content +=
                    "<tr class=\"table-dark\">" +
                    "    <td colspan=\"4\">" + $.i18n("transit-eta-no-data-received") + "</td>" +
                    //"    <td>---</td>" +
                    "</tr>"
                    ;
            } else if (data.schedules.length === 0) {
                content +=
                    "<tr class=\"table-dark\">" +
                    "    <td colspan=\"4\">" + $.i18n("transit-eta-no-schedules-pending") + "</td>" +
                    //"    <td>---</td>" +
                    "</tr>"
                    ;
            } else {
                var active = false;
                for (var schedule of data.schedules) {
                    var eta = Math.floor((schedule.time - schedule.serverTime) / 1000 / 60);

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

                    //TODO: isOutdated

                    var provider = TransitEta.getProvider(schedule.provider);
                    if (!provider) {
                        console.error("Error: Could not find TransitEta provider to get localized names: " + schedule.provider);
                        return;
                    }

                    var colspan = 4;

                    if (h.etaProviders.length > 1) {
                        html += "<td>" + Lang.localizedKey(provider, "name") + "</td>";
                        colspan--;
                    }

                    if (schedule.msg !== undefined && schedule.time === undefined) {
                        html += "<td colspan=\"" + colspan + "\">" + schedule.msg + "</td>";
                    } else {
                        html += "<td>";
                        if (schedule.msg !== undefined) {
                            html += schedule.msg;
                        }
                        if (schedule.time !== undefined) {
                            if (schedule.msg !== undefined) {
                                html += "<br />";
                            }
                            if (eta > 0) {
                                html += $.i18n("transit-eta-minutes", eta);
                            } else {
                                html += $.i18n("transit-eta-arrived-left");
                            }
                        }

                        html += "</td><td";

                        if (schedule.isLive === undefined) {
                            html += " colspan=\"2\"";
                        }

                        html += ">";

                        var time = new Date(schedule.time);

                        if (schedule.time !== undefined) {
                            html += Misc.fillZero(time.getHours()) + ":" + Misc.fillZero(time.getMinutes());
                        } else {
                            html += "---";
                        }

                        html += "</td>";

                        if (schedule.isLive !== undefined) {
                            if (schedule.isLive) {
                                html += "<td><span style=\"color: red; float: right; font-size: 10px;\"><i class=\"fa fa-circle\"></i> " + $.i18n("transit-eta-live") + "</span></td>";
                            } else {
                                html += "<td><span style=\"font-size: 10px; float: right; font-style: italic;\">" + $.i18n("transit-eta-scheduled") + "</span></td>";
                            }
                        }
                    }

                    //TODO: Features

                    html += "</tr>";
                    content += html;
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
        var p = TransitEta.fetchEta({
            provider: result.route.provider,
            etaProviders: result.route.etaProviders,
            routeId: result.route.routeId,
            selectedPath: result.bound,
            stopId: result.stop.stopId
        });
        p.then(function (eta) {
            var text = "";
            var h = eta.options;

            var node = $(".nearby-route-list .route-selection[gtw-provider=\"" + h.provider + "\"][gtw-route-id=\"" + h.routeId + "\"][gtw-bound=\"" + h.selectedPath + "\"][gtw-stop-id=\"" + h.stopId + "\"]");

            node.removeClass("list-group-item-secondary");
            node.removeClass("list-group-item-info");
            node.removeClass("list-group-item-success");
            node.removeClass("list-group-item-warning");
            node.removeClass("list-group-item-danger");
            node.removeClass("list-group-item-light");
            node.removeClass("list-group-item-dark");

            var badgeClass = "btn-secondary";

            if (!eta || !eta.schedules || eta.code && eta.code < 0) {
                text = $.i18n("transit-eta-route-not-available-short");
                node.addClass("list-group-item-light");
            } else if (eta.schedules.length === 0) {
                text = $.i18n("transit-eta-no-schedules-pending-short");
                node.addClass("list-group-item-light");
            } else {
                var schedule = eta.schedules[0];

                var calcEta = Math.floor((schedule.time - schedule.serverTime) / 1000 / 60);

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

                //TODO: isOutdated

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

                    badgeClass = "badge-primary";
                    if (calcEta > 0) {
                        text += $.i18n("transit-eta-minutes", calcEta);
                    } else {
                        text += $.i18n("transit-eta-arrived-left", calcEta);
                        badgeClass = "badge-dark";
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

                /*
                if (schedule.hasTime) {
                    text += Misc.fillZero(schedule.time.hr) + ":" + Misc.fillZero(schedule.time.min);
                } else {
                    text += "---";
                }
                */

                //TODO: Features
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

function findNearbyRoutes() {
    clearInterval(updateEtaTimer);

    var pos = Loc.getCurrentPosition();

    var lat = pos.lat;
    var lng = pos.lng;

    lastLat = lat;
    lastLng = lng;

    var range = Settings.get("min_nearby_transit_range", 200) / 1000.0;

    var allNearbyStops = TransitStops.getAllStopsNearby(lat, lng, range, true, true);

    if (allNearbyStops.length === 0) {
        var testRange = range;
        do {
            testRange += 0.05;
            allNearbyStops = TransitStops.getAllStopsNearby(lat, lng, testRange, true, true);
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
    for (var stopResult of allNearbyStops) {
        if (allNearbyRoutes.length >= maxNearbyBusDisplay) {
            break;
        }

        var routeResults = Transit.searchRoutesOfStop(stopResult.stop);

        for (var routeResult of routeResults) {
            allNearbyRoutes.push({
                route: routeResult.route,
                bound: routeResult.bound,
                stop: stopResult.stop,
                distance: stopResult.distance
            });
        }
    }

    var html;
    var distance;
    var paths;
    var stopId;
    var provider;
    html = "<div class=\"row item-list nearby-route-list\"" + (searchMode ? " style=\"display: none\"" : "") + "><ul class=\"list-group\">";
    for (var result of allNearbyRoutes) {
        paths = result.route.paths[result.bound];
        stopId = paths[paths.length - 1];
        distance = Math.round(result.distance * 1000);
        provider = TransitRoutes.getProvider(result.route.provider);
        html +=
            "    <li class=\"list-group-item list-group-item-action d-flex justify-content-between align-items-center route-selection\" gtw-provider=\"" + result.route.provider + "\" gtw-route-id=\"" + result.route.routeId + "\" gtw-stop-id=\"" + result.stop.stopId + "\" gtw-bound=\"" + result.bound + "\">" +
            "        <div class=\"d-flex flex-column route-id\">" +
            "            <div>" + Lang.localizedKey(provider, "name") + "</div>" +
            "            <div>" + Lang.localizedKey(result.route, "routeName") + "</div>" +
            "        </div>" +
            "        <div class=\"d-flex flex-column stop-info mr-auto\">" +
            "            <div>" +
            "                <b>" + $.i18n("transit-eta-to") + ":</b> <small>" + Lang.localizedKey(TransitStops.getStopById(stopId), "stopName") +
            "</small></div>" +
            "            <div>" +
            "                " + Lang.localizedKey(result.stop, "stopName") + " (" + distance + $.i18n("transit-eta-metres") + ")" +
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

export function enable() {
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

    var providers = TransitRoutes.getProviders();

    if (providers.length > 0) {
        var buttonScroll =
            "<div class=\"hori-scroll btn-group\">" +
            "    <button type=\"button\" class=\"btn btn-primary gtw-providersort gtw-providersort-all\"><i class=\"fa fa-reply-all\"></i><br />" + $.i18n("transit-eta-sort-all") + "</button>";

        for (var iprovider of providers) {
            var image = "";
            if (iprovider.type === TransitType.BUS) {
                image = "fa-bus";
            } else if (iprovider.type === TransitType.TRAIN) {
                image = "fa-train";
            } else {
                image = "fa-question";
            }
            buttonScroll += " <button type=\"button\" class=\"btn btn-default gtw-providersort gtw-providersort-provider\" gtw-provider=\"" + iprovider.id + "\"><i class=\"fa " + image + "\"></i><br />" + Lang.localizedKey(iprovider, "name") + "</button>";
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

                var provider = $(this).attr("gtw-provider");
                $(this).addClass("btn-primary");

                $(".gtw-providersort-provider:not([gtw-provider='" + provider + "'])").addClass("btn-default");
                $(".route-selection[gtw-provider='" + provider + "']").attr("style", "");
                $(".route-selection:not([gtw-provider='" + provider + "'])").attr("style", "display: none!important");
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