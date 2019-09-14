//GTW UI

define(function (require, exports, module) {
    var ETAManager = require("gtw-eta");
    var Map = require("gtw-map");
    var Settings = require("gtw-settings");
    var Loc = require("gtw-location");

    $(".ui-tab").on("click", function () {
        if ($(this).hasClass("btn-primary")) {
            return;
        }
        $(".ui-tab").removeClass("btn-primary");
        $(".ui-tab").removeClass("btn-link");

        var tab = $(this).attr("gtw-tab");
        $(this).addClass("btn-primary");

        $(".ui-tab:not([gtw-tab='" + tab + "'])").addClass("btn-link");

        exports.showTab(tab);
    });

    exports.currentTab = "transitEta";

    exports.vars = {};

    exports.timers = [];

    exports.init = function () {
        exports.showTab("transitEta");
        adjustMargin();
        exports.showPanel();
    };

    exports.clearUp = function () {
        exports.vars = {};
        for (var id of exports.timers) {
            clearTimeout(id);
        }
        exports.timers = [];
        $(".tab-panel").html("");
        $(".item-list").html("");
    };

    exports.showTab = function (tab) {
        exports.clearUp();
        exports.currentTab = tab;
        exports.scripts[tab]();
    };

    exports.showPanel = function () {
        $(".item-list").fadeIn(500);
        $(".search-panel").fadeIn(500);
        $(".header nav").addClass("bg-dark");
        $(".map-overlay").fadeIn(500);
    }

    exports.hidePanel = function () {
        $(".item-list").fadeOut(500);
        $(".search-panel").fadeOut(500);
        $(".header nav").removeClass("bg-dark");
        $(".map-overlay").fadeOut(500);
    }

    exports.drawRouteOnMap = function (route, bound, stop = false) {
        var path = route.paths[bound];

        var coords = [];
        var pos;
        var targetPos = false;
        var dbStop;
        var i;
        for (i = 0; i < path.length; i++) {
            dbStop = ETAManager.getStopById(path[i]);
            pos = { lat: dbStop.lat, lng: dbStop.lng };
            coords.push(pos);
            Map.addMarker(pos, dbStop.stopName, "" + (i + 1));

            if (stop && dbStop.stopId === stop.stopId) {
                targetPos = pos;
            }
        }

        Map.addPolyline(coords, "#FF0000", 2);

        if (targetPos) {
            Map.setCenter(targetPos);
            Map.setZoom(18);
        }
    }

    exports.scripts = {
        "transitEtaUpdateUi": function () {
            var allNearbyRoutes = exports.vars["allNearbyRoutes"];
            var h;
            for (var result of allNearbyRoutes) {
                h = ETAManager.request({
                    provider: result.route.provider,
                    route: result.route,
                    selectedPath: result.bound,
                    stop: result.stop
                });

                var text = "";
                var eta = ETAManager.getEta(h);
                
                var node = $(".nearby-route[gtw-provider=\"" + h.provider + "\"][gtw-route-id=\"" + h.route + "\"][gtw-bound=\"" + h.selectedPath + "\"][gtw-stop-id=\"" + h.stop + "\"]");
                
                node.removeClass("list-group-item-secondary");
                node.removeClass("list-group-item-info");
                node.removeClass("list-group-item-success");
                node.removeClass("list-group-item-warning");
                node.removeClass("list-group-item-danger");
                node.removeClass("list-group-item-light");
                node.removeClass("list-group-item-dark");

                if (!eta || !eta.schedules || !eta.serverTime) {
                    text = "N/A";
                    node.addClass("list-group-item-light");
                } else if (eta.schedules.length == 0) {
                    text = "No Schedules";
                    node.addClass("list-group-item-light");
                } else {
                    var schedule = eta.schedules[0];

                    var eta = ETAManager.timeDifference(schedule.time, eta.serverTime);
                    var css = "";

                    if (eta >= 20) {
                        css = "secondary";
                    } else if (eta >= 15) {
                        css = "info";
                    } else if (eta >= 10) {
                        css = "success";
                    } else if (eta >= 5) {
                        css = "warning";
                    } else if (eta >= 1) {
                        css = "danger"
                    } else {
                        css = "dark";
                    }
                    node.addClass("list-group-item-" + css);

                    //TODO: isOutdated

                    if (schedule.hasMsg) {
                        text = schedule.msg;
                    }
                    if (schedule.hasTime) {
                        if (schedule.hasMsg) {
                            text += "<br />";
                        }
                        if (eta > 1) {
                            text += eta + " mins";
                        } else if (eta == 1) {
                            text += eta + " min";
                        } else {
                            text += "Arrived/Left";
                        }
                    }

                    if (schedule.isLive) {
                        text += "<br /><span style=\"color: red; float: right; font-size: 10px;\"><i class=\"fa fa-circle\"></i> Live</span>";
                    } else {
                        text += "<br /><span style=\"font-size: 10px; float: right; font-style: italic;\">Scheduled</span>";
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
                var badge = node.children(".transit-eta")
                badge.html(text);
            }
        },
        "transitEta": function () {
            var pos = Loc.getCurrentPosition();
            var providers = ETAManager.getProviders();

            if (providers.length > 0) {
                var buttonScroll =
                    "<div class=\"hori-scroll\">" +
                    "    <button type=\"button\" class=\"btn btn-primary gtw-providersort gtw-providersort-all\"><i class=\"fa fa-reply-all\"></i><br />All</button>";

                for (var provider of providers) {
                    var image = "";
                    if (provider.transit == TransitType.TRANSIT_BUS) {
                        image = "fa-bus";
                    } else if (provider.transit == TransitType.TRANSIT_METRO || provider.transit == TransitType.TRANSIT_TRAIN) {
                        image = "fa-train";
                    } else {
                        image = "fa-question";
                    }
                    buttonScroll += " <button type=\"button\" class=\"btn btn-default gtw-providersort gtw-providersort-provider\" gtw-provider=\"" + provider.name + "\"><i class=\"fa " + image + "\"></i><br />" + provider.name + "</button>";
                }

                buttonScroll += "</div><br />";

                $(".tab-panel").append(buttonScroll);

                $(".gtw-providersort").on("click", function () {
                    if ($(this).hasClass("btn-primary")) {
                        return;
                    }
                    $(".gtw-providersort").removeClass("btn-primary");
                    $(".gtw-providersort").removeClass("btn-default");

                    if ($(this).hasClass("gtw-providersort-all")) {
                        $(this).addClass("btn-primary");

                        $(".gtw-providersort-provider").addClass("btn-default");
                    } else {
                        var provider = $(this).attr("gtw-provider");
                        console.log('Provider' + provider)
                        $(this).addClass("btn-primary");

                        $(".gtw-providersort-provider:not([gtw-provider='" + provider + "'])").addClass("btn-link");
                    }
                });
                
                var lat = pos.lat;
                var lng = pos.lng;
                var range = Settings.get("min_nearby_transit_range", 200) / 1000.0;

                var allNearbyStops = ETAManager.getAllStopsNearbyCoord(lat, lng, range, true, true);

                if (allNearbyStops.length == 0) {
                    var testRange = range;
                    do {
                        testRange += 0.05;
                        allNearbyStops = ETAManager.getAllStopsNearbyCoord(lat, lng, testRange, true, true);
                    } while (allNearbyStops.length == 0 && testRange < 10);

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
                            "No routes " + (range * 1000) + "m nearby! The following routes are in " + Math.ceil(testRange * 1000) + " m range." +
                            "</div>"
                        );
                    }
                }

                var maxNearbyBusDisplay = Settings.get("max_nearby_transit_to_display", 20);
                console.log(allNearbyStops);
                var allNearbyRoutes = [];
                for (var stopResult of allNearbyStops) {
                    if (allNearbyRoutes.length >= maxNearbyBusDisplay) {
                        break;
                    }

                    var routeResults = ETAManager.searchRoutesOfStop(stopResult.stop);
                    console.log(stopResult.stop);

                    for (var routeResult of routeResults) {
                        console.log(routeResult);
                        allNearbyRoutes.push({
                            route: routeResult.route,
                            bound: routeResult.bound,
                            stop: stopResult.stop,
                            distance: stopResult.distance,
                        });
                    }
                }
                console.log(allNearbyRoutes);

                var html;
                var distance;
                var paths;
                var stopId;
                html = "<ul class=\"list-group\">"
                for (var result of allNearbyRoutes) {
                    console.log(result);
                    paths = result.route.paths[result.bound];
                    stopId = paths[paths.length - 1];
                    distance = Math.round(result.distance * 1000);
                    html +=
                        "    <li class=\"list-group-item list-group-item-action d-flex justify-content-between align-items-center nearby-route\" gtw-provider=\"" + result.route.provider + "\" gtw-route-id=\"" + result.route.routeId + "\" gtw-stop-id=\"" + result.stop.stopId + "\" gtw-bound=\"" + result.bound + "\">" +
                        "        <div class=\"d-flex flex-column route-id\">" +
                        "            <div>" + result.route.provider + "</div>" +
                        "            <div>" + result.route.routeId + "</div>" +
                        "        </div>" +
                        "        <div class=\"d-flex flex-column stop-info mr-auto\">" +
                        "            <div>" +
                        "                <b>To:</b> <small>" + ETAManager.getStopById(stopId).stopName +
                        "</small></div>" +
                        "            <div>" +
                        "                " + result.stop.stopName + " (" + distance + "m)" +
                        "            </div>" +
                        "        </div>" +
                        "        <span class=\"badge badge-secondary badge-pill transit-eta\">Retrieving...</span>" +
                        "    </li>";

                    ETAManager.request({
                        provider: result.route.provider,
                        route: result.route,
                        selectedPath: result.bound,
                        stop: result.stop
                    });
                }
                html += "</ul>";
                $(".item-list").html(html);

                $(".nearby-route").on("click", function () {
                    exports.hidePanel();

                    var provider = ETAManager.getProvider($(this).attr("gtw-provider"));
                    var route = provider.getRouteById($(this).attr("gtw-route-id"));
                    var stop = provider.getStopById($(this).attr("gtw-stop-id"));
                    var bound = $(this).attr("gtw-bound");

                    exports.drawRouteOnMap(route, bound, stop);
                });

                exports.timers.push(setInterval(function () {
                    console.log("Update UI!");
                    exports.scripts["transitEtaUpdateUi"]();
                }, 1000));
                exports.vars["allNearbyRoutes"] = allNearbyRoutes;
            } else {
                //TODO: better message or auto add plugins according to region
                $(".tab-panel").html("You do not have any plugins providing ETA data. Install one from the plugins manager.")
            }
        }
    };
});