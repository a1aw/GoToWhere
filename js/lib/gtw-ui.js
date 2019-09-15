//GTW UI

define(function (require, exports, module) {
    var ETAManager = require("gtw-eta");
    var Map = require("gtw-map");
    var Settings = require("gtw-settings");
    var RequestLimiter = require("gtw-requestlimiter");
    var PluginLoader = require("gtw-pluginloader");
    var Loc = require("gtw-location");

    $(document).ready(function () {
        $(".header-links-plugins").on("click", function () {
            exports.showModal("pluginmanager");
        });
        $(".header-links-settings").on("click", function () {
            exports.showModal("settings");
        });
        $(".header-links-about").on("click", function () {
            exports.showModal("about");
        });
    });

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

    exports.modalVars = {};

    exports.timers = [];

    exports.modalTimers = [];

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

    exports.modalClearUp = function () {
        exports.modalVars = {};
        for (var timer of exports.modalTimers) {
            clearInterval(timer);
        }
    };

    exports.showModal = function (layout, ...args) {
        //exports.nowUi = layout;
        //exports.previousUi = 0;
        exports.modalClearUp();
        exports.modalVars = {};

        exports.loadModalLayout(layout, true).then(function () {
            if (typeof exports.scripts[layout] === "function") {
                (exports.scripts[layout]).apply(this, args);
            }
        });
    };

    exports.loadModalLayout = function (layout, options = {}) {
        var key = "modal-" + layout;

        if (options === true) {
            options = {};
            options.backdrop = "static";
            options.keyboard = false;
        }
        console.log(options);

        var proms = [];
        proms.push(new Promise((resolve, reject) => {
            $(".modal-header").load("ui/" + key + "-header.html", resolve);
        }));
        proms.push(new Promise((resolve, reject) => {
            $(".modal-body").load("ui/" + key + "-body.html", resolve);
        }));
        proms.push(new Promise((resolve, reject) => {
            $(".modal-footer").load("ui/" + key + "-footer.html", resolve);
        }));

        var p = Promise.all(proms);
        p.then(function () {
            $(".modal").modal();
        });
        return p;
    };

    exports.hideModal = function () {
        $(".modal").modal("hide");
    };

    exports.isModalShown = function () {
        return ($(".modal").data('bs.modal') || {})._isShown;
    }

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
    };

    exports.hidePanel = function () {
        $(".item-list").fadeOut(500);
        $(".search-panel").fadeOut(500);
        $(".header nav").removeClass("bg-dark");
        $(".map-overlay").fadeOut(500);
    };

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
    };

    exports.scripts = {
        "viewplugin": function (reposJson, package) {
            console.log(reposJson);
            console.log(package);
            $(".modal .close").on("click", function () {
                exports.showModal("pluginmanager");
            });

            var packageJson = 0;
            for (var key in reposJson) {
                var i;
                for (var json of reposJson[key]) {
                    if (json.package === package) {
                        packageJson = json;
                        break;
                    }
                }

                if (packageJson) {
                    break;
                }
            }

            exports.modalVars["reposJson"] = reposJson;
            exports.modalVars["packageJson"] = packageJson;

            if (!packageJson) {
                $(".modal-body").html("Could not find required package in repository.");
                return;
            }

            var html = "";
            html += "<h3>Details</h3>";
            html += "<hr />";
            html += "<p>Name: " + json.name + "<br />";
            html += "Full Name: " + json.fullName + "<br />";
            html += "Author: " + json.author + "<br />";
            html += "Version: " + json.version + "<br />";
            html += "GitHub: <a href=\"" + json.github + "\" target=\"_blank\">" + json.github + "</a><br />";
            html += "Package: " + json.package + "<br />";
            html += "Description: " + json.desc + "</p>";

            var localChecksum = 0;

            html += "<h3>Installation</h3>";
            html += "<hr />";

            var json = PluginLoader.getPlugin(json.package);

            var statusMsg = "<span class=\"font-weight-bold ";
            if (!json) {
                statusMsg += "text-info\">Not installed";
            } else if (json.status == -1) {
                statusMsg += "text-danger\">Installed but could not start up correctly.";
            } else if (json.status == 0) {
                statusMsg += "text-success\">Installed and running";
            } else if (json.status == 1) {
                statusMsg += "text-secondary\">Not enabled";
            }
            statusMsg += "</span>";

            html += "<p>Status: " + statusMsg + "<br />";

            if (json && json.msg) {
                html += "Message: " + json.msg + "</p>";
            }

            if (json) {
                html += "Local version: " + json.local.version + "<br />";
                html += "Local Checksum: " + json.local.checksum + "<br />";
                html += "Online Checksum: " + json.checksum + "<br />";
                html += "Checksum validity: <span class=\"font-weight-bold " +
                    (json.checksum === localChecksum ? "text-success\">Valid" : "text-danger\">Invalid") + "</span></p>";
            }

            html += "<hr />";

            if (json) {
                html += "<button type=\"button\" class=\"btn btn-danger ui-btn-viewplugin-uninstall\">Uninstall and restart</button>";
            } else {
                html += "<button type=\"button\" class=\"btn btn-success ui-btn-viewplugin-install\">Install and restart</button>";
            }

            $(".modal-body").html(html);

            $(".ui-btn-viewplugin-install").on("click", function () {
                PluginLoader.install(packageJson.package, "dummychecksum");
                window.location.reload();
            });

            $(".ui-btn-viewplugin-uninstall").on("click", function () {
                PluginLoader.uninstall(packageJson.package);
                window.location.reload();
            });
        },

        "pluginmanager": function () {
            var html = "<p>Loading...</p>";

            $("#nav-all").html(html);
            $("#nav-installed").html(html);
            $("#nav-transit").html(html);
            $("#nav-libraries").html(html);
            $("#nav-others").html(html);

            $(".ui-btn-thirdparty").on("click", function () {
                var jsonStr = prompt("JSON code:");
                var json;
                try {
                    json = JSON.parse(jsonStr);
                } catch (err) {
                    alert("Parsing JSON failed!");
                }

                if (json && json.package) {
                    localStorage.setItem(json.package, JSON.stringify(json));
                    alert("Installed " + json.package + ". Restart the application to take effect.");
                }
            });

            $.ajax({
                url: "https://plugins.gotowhere.ga/repository.json",
                dataType: "json",
                success: function (reposJson) {
                    exports.modalVars["reposJson"] = reposJson;

                    var cats = [
                        "transit",
                        "lib"
                    ];

                    var html = "<div class=\"list-group\"></div>";

                    $("#nav-all").html(html);
                    $("#nav-installed").html(html);
                    $("#nav-transit").html(html);
                    $("#nav-lib").html(html);
                    $("#nav-others").html(html);

                    var total = 0;
                    var others = 0;
                    for (var key in reposJson) {
                        var json;
                        var i;
                        for (i = 0; i < reposJson[key].length; i++) {
                            json = reposJson[key][i];

                            html = "<a href=\"#\" class=\"list-group-item list-group-item-action ui-pluginmanager-view-plugin\" package=\"" + json.package + "\">";
                            html += "    <div class=\"d-flex w-100 justify-content-between\">";
                            html += "        <h5 class=\"mb-1\">" + json.fullName + "</h5>";
                            html += "        <small>" + json.version + "</small>";
                            html += "    </div>";
                            html += "    <p class=\"mb-1\">" + json.desc + "</p>";
                            html += "    <small>By " + json.author + "</small>";
                            html += "</a>";

                            $("#nav-all div.list-group").append(html);
                            if (cats.includes(key)) {
                                $("#nav-" + key + " div.list-group").append(html);
                            } else {
                                $("#nav-others div.list-group").append(html);
                                others++;
                            }

                            total++;
                        }
                    }

                    $("#nav-all-tab").html("All (" + total + ")");
                    $("#nav-transit-tab").html("Transit (" + reposJson["transit"].length + ")");
                    $("#nav-lib-tab").html("Libraries (" + reposJson["lib"].length + ")");
                    $("#nav-others-tab").html("Others (" + others + ")");

                    $(".ui-pluginmanager-view-plugin").on("click", function () {
                        exports.showModal("viewplugin", exports.modalVars["reposJson"], $(this).attr("package"));
                    });
                },
                error: function () {

                }
            });
        },

        "settings": function () {
            var html = "";

            var val;
            for (var setting of Settings.DEFAULT_SETTINGS) {
                val = Settings.get(setting.key, setting.def);
                html +=
                    "<div class=\"form-group\">" +
                    "    <label><b>" + setting.name + ":</b><p>" + setting.desc + "</p></label>";
                if (setting.type == "boolean") {
                    html += "    <select class=\"form-control\" id=\"gtw-settings-" + setting.key + "\">";
                    if (val) {
                        html +=
                            "        <option selected>Yes</option>" +
                            "        <option>No</option>";
                    } else {
                        html +=
                            "        <option>Yes</option>" +
                            "        <option selected>No</option>";
                    }
                    html += "    </select>";
                } else {
                    html += "    <input class=\"form-control\" id=\"gtw-settings-" + setting.key + "\" type=\"";
                    if (setting.type == "number") {
                        html += "number";
                    } else {
                        html += "text";
                    }
                    html += "\" value=\"" + val + "\"/>";
                }
                html += "</div>";

            }

            html +=
                "<input type=\"button\" class=\"btn btn-success ui-btn-settings-save ui-btn-settings-save-close\" value=\"Save & Close\"/> " +
                "<input type=\"button\" class=\"btn btn-default ui-btn-settings-save\" value=\"Apply\"/>";

            $(".modal-body").html(html);

            $(".ui-btn-settings-save").on("click", function () {
                var val;
                var out;
                for (var setting of DEFAULT_SETTINGS) {
                    val = $("#gtw-settings-" + setting.key).val();
                    if (setting.type == "boolean") {
                        out = val == "Yes";
                    } else if (setting.type == "number") {
                        out = parseInt(val);
                    } else {
                        out = val;
                    }
                    if (setting.checkfunc && !setting.checkfunc(out)) {
                        alert("The value for \"" + setting.name + "\" is invalid.");
                        return;
                    }
                    Settings.set(setting.key, out);
                }
                Settings.save();

                if ($(this).hasClass("ui-btn-settings-save-close")) {
                    exports.hideModal();
                }
            });
        },

        "transitEtaUpdateUi": function () {
            var requestLen = RequestLimiter.requests.length;
            if (requestLen > 0) {
                $(".request-progress-panel").fadeIn(500);

                var max = exports.vars["maxRequest"];
                if (!max || requestLen > max) {
                    max = exports.vars["maxRequest"] = requestLen;
                }

                $(".request-progress-panel small").html("Requesting " + (max - requestLen) + "/" + max + " ETA data... (" + requestLen + " left)");
                $(".request-progress-panel .progress-bar").html(Math.floor((max - requestLen) / max * 100) + "%");
                $(".request-progress-panel .progress-bar").css("width", Math.floor((max - requestLen) / max * 100)+ "%");
            } else {
                exports.vars["maxRequest"] = 0;
                $(".request-progress-panel .progress-bar").css("width", "100%");
                $(".request-progress-panel").fadeOut(500, function () {
                    $(".request-progress-panel .progress-bar").css("width", "0%");
                });
            }
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
            RequestLimiter.clear();
            ETAManager.clearCache();

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

                var requestProgressBar =
                    "<div class=\"request-progress-panel\">" +
                    "    <small id=\"startup-status\">Requesting...</small>" +
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