//OpenETA Event Manager

const UIMANAGER_FUNC_NEARBY_ROUTE_SELECT = "UIMANAGER_FUNC_NEARBY_ROUTE_SELECT";
const UIMANAGER_FUNC_SAVE_SETTINGS = "UIMANAGER_FUNC_SAVE_SETTINGS";
const UIMANAGER_FUNC_SORT_COMPANY = "UIMANAGER_FUNC_SORT_COMPANY";
const UIMANAGER_FUNC_UNSORT_COMPANY = "UIMANAGER_FUNC_UNSORT_COMPANY";
const UIMANAGER_FUNC_SEARCH = "UIMANAGER_FUNC_ONLINE_PLUGIN";
const UIMANAGER_VAR_ALL_NEARBY_ROUTES = "UIMANAGER_VAR_ALL_NEARBY_ROUTES";

var UIManager = function () {

	var global = this;

	Func.registerFunction(UIMANAGER_FUNC_NEARBY_ROUTE_SELECT, function (index) {
		global.clearUp();
		//global.hide();
		var data = global.variables[UIMANAGER_VAR_ALL_NEARBY_ROUTES][index];
		var route = data[0];
		var pathIndex = data[1];
		var selectedStop = data[2];
		OpenETAMap.showRoute(route, pathIndex, selectedStop);
	});

	Func.registerFunction(UIMANAGER_FUNC_SORT_COMPANY, function (company) {
		company = company.toString();
		$(".openeta-company").css("display", "none");
		$(".openeta-company-" + company.trim()).css("display", "");
		$(".openeta-sortcompany").removeClass("btn-primary");
		$(".openeta-sortcompany").addClass("btn-default");
		$(".openeta-sortcompany-" + company.trim()).addClass("btn-primary");
		$(".openeta-sortcompany-" + company.trim()).removeClass("btn-default");
	});

	Func.registerFunction(UIMANAGER_FUNC_UNSORT_COMPANY, function () {
		$(".openeta-company").css("display", "");
		$(".openeta-sortcompany").removeClass("btn-primary");
		$(".openeta-sortcompany").addClass("btn-default");
		$(".openeta-unsortcompany").addClass("btn-primary");
		$(".openeta-unsortcompany").removeClass("btn-default");
	});

	Func.registerFunction(UIMANAGER_FUNC_SAVE_SETTINGS, function (args) {
		var val;
		var out;
		for (var setting of DEFAULT_SETTINGS) {
			val = $("#openeta-settings-" + setting.key).val();
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
		if (args.length > 0 && args[0]) {
			UIManager.show("home");
		}
	});

	this.timers = [];

    this.variables = {};

    this.nowUi = 0;

    this.previousUi = 0;

    this.uiLayouts = [
        "modal-home",
        "modal-pluginmanager",
        "modal-settings",
        "modal-viewplugin"
    ];

    this.loadedUiLayouts = {};

    this.__loadUiLayoutTask = 0;

    this.__loadUiLayoutsDoneFunc = 0;

    this.loadUiLayouts = function (doneFunc) {
        this.__loadUiLayoutsDoneFunc = doneFunc;
        this.__loadUiLayoutTask = 0;
        this.__postLoadUiLayouts();
    };

    this.__postLoadUiLayouts = function () {
        if (this.__loadUiLayoutTask >= this.uiLayouts.length) {
            if (this.__loadUiLayoutsDoneFunc && typeof this.__loadUiLayoutsDoneFunc === "function") {
                this.__loadUiLayoutsDoneFunc();
                this.__loadUiLayoutsDoneFunc = 0;
            }
        } else {
            var key = this.uiLayouts[this.__loadUiLayoutTask];
            $.ajax({
                url: "ui/" + key + ".html",
                success: function (data) {
                    UIManager.loadedUiLayouts[key] = data;
                    UIManager.__loadUiLayoutTask++;
                    UIManager.__postLoadUiLayouts();
                },
                error: function () {
                    alert("Error loading ui layouts");
                }
            });
        }
    }

    this.showLayoutModal = function (layout, options = {}) {
        var key = "modal-" + layout;
        var mKey = ".ui-" + key;

        if (options === true) {
            options = {};
            options.backdrop = "static";
            options.keyboard = false;
        }

        var func = function () {
            $(".modal").remove();

            $("#ui").append(UIManager.loadedUiLayouts[key]);
            $(mKey).modal(options);
            EventManager.dispatchEvent(EVENTS.EVENT_UI_SHOW);
        };

        if ($(".modal").length > 0) {
            $(".modal").modal("hide");
            setTimeout(func, 500);
        } else {
            func();
        }
    }

    this.hideLayoutModal = function (layout) {
        var key = "modal-" + layout;
        var mKey = ".ui-" + key;

        $(mKey).modal("hide");
        setTimeout(function () {
            $(mKey).remove();
        }, 500);
    }

    this.clearUp = function () {
        for (var timer of this.timers) {
            clearInterval(timer);
        }
    };

    this.previous = function () {
        if (typeof this.previousUi === "function") {
            this.previousUi();
        }
    };

    this.scripts = {
        "viewplugin": function (args) {
            $(".ui-modal-viewplugin .close").on("click", function () {
                UIManager.show("pluginmanager");
            });

            var packageJson = 0;
            for (var key in args[0]) {
                var i;
                for (var json of args[0][key]) {
                    if (json.package === args[1]) {
                        packageJson = json;
                        break;
                    }
                }

                if (packageJson) {
                    break;
                }
            }
            UIManager.variables["reposJson"] = args[0];
            UIManager.variables["packageJson"] = packageJson;

            if (!packageJson) {
                $(".ui-modal-viewplugin .modal-body").html("Could not find required package in repository.");
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

            $(".ui-modal-viewplugin .modal-body").html(html);

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
            $(".ui-modal-pluginmanager .close").on("click", function () {
                UIManager.show("home");
            });

            var html = "<p>Loading...</p>";
            $("#nav-all").html(html);
            $("#nav-installed").html(html);
            $("#nav-transit").html(html);
            $("#nav-libraries").html(html);
            $("#nav-others").html(html);

            $.ajax({
                url: "https://plugins.openeta.ml/repository.json",
                dataType: "json",
                success: function (reposJson) {
                    UIManager.variables["reposJson"] = reposJson;

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
                        UIManager.show("viewplugin", UIManager.variables["reposJson"], $(this).attr("package"));
                    });
                },
                error: function () {

                }
            });
        },

        "settings": function () {
            $(".ui-btn-settings-backhome").on("click", function () {
                UIManager.show("home");
            });

            var html = "";

            var val;
            for (var setting of DEFAULT_SETTINGS) {
                val = Settings.get(setting.key, setting.def);
                html +=
                    "<div class=\"form-group\">" +
                    "    <label><b>" + setting.name + ":</b><p>" + setting.desc + "</p></label>";
                if (setting.type == "boolean") {
                    html += "    <select class=\"form-control\" id=\"openeta-settings-" + setting.key + "\">";
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
                    html += "    <input class=\"form-control\" id=\"openeta-settings-" + setting.key + "\" type=\"";
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
                "<input type=\"button\" class=\"btn btn-success\" onclick=\"Func.call(UIMANAGER_FUNC_SAVE_SETTINGS, true);\" value=\"Save & Close\"/> " +
                "<input type=\"button\" class=\"btn btn-default\" onclick=\"Func.call(UIMANAGER_FUNC_SAVE_SETTINGS, false);\" value=\"Apply\"/>";

            $(".ui-modal-settings .modal-body").html(html);
        },

        "home": function () {
            var pos = map.getCenter();
            var providers = ETAManager.getProviders();

            $(".ui-btn-home-settings").on("click", function () {
                UIManager.show("settings");
            });

            $(".ui-btn-home-pluginmanager").on("click", function () {
                UIManager.show("pluginmanager");
            });

            if (providers.length > 0) {
                $(".ui-modal-home.modal-body").html("");

                $(".ui-modal-home.modal-body").append("<hr />");

                var buttonScroll =
                    "<div class=\"hori-scroll\">" +
                    "    <button type=\"button\" class=\"btn btn-primary openeta-sortcompany openeta-unsortcompany\" onclick=\"Func.call(UIMANAGER_FUNC_UNSORT_COMPANY)\"><i class=\"fa fa-reply-all\"></i><br />All</button>";

                for (var provider of providers) {
                    var image = "";
                    if (provider.transit == TransitType.TRANSIT_BUS) {
                        image = "fa-bus";
                    } else if (provider.transit == TransitType.TRANSIT_METRO || provider.transit == TransitType.TRANSIT_TRAIN) {
                        image = "fa-train";
                    } else {
                        image = "fa-question";
                    }
                    buttonScroll += " <button type=\"button\" class=\"btn btn-default openeta-sortcompany openeta-sortcompany-" + provider.name.trim() + "\" onclick=\"Func.call(UIMANAGER_FUNC_SORT_COMPANY, '" + provider.name.trim() + "')\"><i class=\"fa " + image + "\"></i><br />" + provider.name + "</button>";
                }

                buttonScroll += "</div><br />";

                $(".ui-modal-home.modal-body").append(buttonScroll);

                var lat = pos.lat();
                var lng = pos.lng();
                var range = Settings.get("min_nearby_transit_range", 200) / 1000.0;

                var allNearbyStops = ETAManager.getAllStopsNearbyCoord(lat, lng, range, true, true);

                if (allNearbyStops.length <= 0) {
                    var testRange = range;
                    do {
                        testRange += 0.05;
                        allNearbyStops = ETAManager.getAllStopsNearbyCoord(lat, lng, testRange, true, true);
                    } while (allNearbyStops.length <= 0);

                    $(".ui-modal-home.modal-body").append(
                        "<div class=\"alert alert-warning alert-dismissable\">" +
                        "<button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-hidden=\"true\" >&#215;</button>" +
                        "No routes " + (range * 1000) + "m nearby! The following routes are in " + Math.ceil(testRange * 1000) + " m range." +
                        "</div>"
                    );
                }

                $(".ui-modal-home.modal-body").append(
                    "<div class=\"table-responsive\">" +
                    "    <table id=\"home-nearbystops-table\" class=\"table openeta-nearbystops-table\">" +
                    "    </table>" +
                    "</div>"
                );
                /*
                $(".modal-body").append(
                    "<div class=\"list-group\" id=\"home-nearbystops-listgroup\">" +
                    "</div>"
                );
                */

                var node = $("#home-nearbystops-table");
                //var node = $("#home-nearbystops-listgroup");
                node.html("");

                var maxNearbyBusDisplay = Settings.get("max_nearby_transit_to_display", 20);
                console.log(allNearbyStops);
                var allNearbyRoutes = [];
                for (var stop of allNearbyStops) {
                    if (allNearbyRoutes.length >= maxNearbyBusDisplay) {
                        break;
                    }
                    var routes = ETAManager.searchRoutesOfStop(stop[0]);
                    for (var route of routes) {
                        console.log(route[0].routeId + ", " + route[1] + ", " + stop[0].stopId);
                        allNearbyRoutes.push([route[0], route[1], stop[0], stop[1]]);
                    }
                }
                console.log(allNearbyRoutes);

                //var hs = [];

                for (var i = 0; i < allNearbyRoutes.length; i++) {
                    var route = allNearbyRoutes[i];
                    var d = Math.round(route[3] * 1000);
                    var nodeText =
                        "<tr onclick=\"Func.call('" + UIMANAGER_FUNC_NEARBY_ROUTE_SELECT + "', " + i + ")\" class=\"eta openeta-company openeta-company-" + route[0].provider.name.toString().trim() + "\">" +
                        "    <td><span>" + route[0].provider.name + "</span><br /><b>" + route[0].routeId + "</b></td>" +
                        "    <td>" + route[2].stopNameEng + " (" + d + "m)" + "</td>" +
                        "    <td><span class=\"list-group-item-text\" id=\"openeta-nearbyeta-" + route[0].provider.name + "-" + route[0].routeId + "-" + route[1] + "-" + route[2].stopId + "\">---</span></td>" +
                        "</tr>"
                        ;
                    node.append(nodeText);
                    /*
                    node.append(
                        "<div onclick=\"Func.call('" + UIMANAGER_FUNC_NEARBY_ROUTE_SELECT + "', " + i + ")\" class=\"list-group-item openeta-company openeta-company-" + route[0].provider.name.toString().trim() + "\">" +
                        "    <h5 class=\"list-group-item-heading\">" + route[0].routeId + "</h5>" +
                        "    <span style=\"float: right\">" + route[0].provider.name + "</span>" +
                        "    <p class=\"list-group-item-text\" id=\"openeta-nearbyeta-" + route[0].provider.name + "-" + route[0].routeId + "-" + route[1] + "-" + route[2].stopId + "\">---</p>" + route[2].stopNameEng + " (" + d +
                        "m)</div>"
                    );
                    */
                    ETAManager.request({
                        provider: route[0].provider,
                        route: route[0],
                        selectedPath: route[1],
                        stop: route[2]
                    });
                }

                /*
                hs.forEach(function (h) {
                    h.fetchETA().done(function () {
                    });
                });
                */

                var global = this;
                this.timers.push(setInterval(function () {
                    console.log("Update UI!");
                    global.updateEtaUi();
                }, 1000));

                this.variables[UIMANAGER_VAR_ALL_NEARBY_ROUTES] = allNearbyRoutes;

            }
            EventManager.dispatchEvent(EVENTS.EVENT_UI_HOME);
        }
    };

    this.show = function (layout, ...args) {
        this.nowUi = layout;
        this.previousUi = 0;
        this.clearUp();
        this.variables = {};

        UIManager.showLayoutModal(layout, true);
        if (typeof UIManager.scripts[layout] === "function") {
            setTimeout(function () {
                UIManager.scripts[layout](args);
            }, 500);
        }
    };

    this.updateEtaUi = function () {
        var routes = this.variables[UIMANAGER_VAR_ALL_NEARBY_ROUTES];

        for (var route of routes) {
            var h = ETAManager.request({
                provider: route[0].provider,
                route: route[0],
                selectedPath: route[1],
                stop: route[2]
            });

            var text = "";
            var eta = h.getETA();

            var key = h.route.provider.name + "-" + h.route.routeId + "-" + h.selectedPath + "-" + h.stop.stopId;
            var node = $("#openeta-nearbyeta-" + key);

            if (!eta || !eta.schedules || !eta.serverTime) {
                text = "ETA Not available";
            } else if (eta.schedules.length == 0) {
                text = "No schedules pending";
            } else {
                var schedule = eta.schedules[0];

                var eta = schedule.getRemainingMinutes(eta.serverTime);
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
                    text += " <span style=\"color: red; float: right; font-size: 10px;\"><i class=\"fa fa-circle\"></i> Live</span>";
                } else {
                    text += " <span style=\"font-size: 10px; float: right; font-style: italic;\">Scheduled</span>";
                }

				/*
				if (schedule.hasTime) {
					text += Misc.fillZero(schedule.time.hr) + ":" + Misc.fillZero(schedule.time.min);
				} else {
					text += "---";
				}
				*/

                //TODO: Features
                node.parent().parent().addClass("table-" + css)
            }
            node.html(text);
        }

    };

    this.isShown = function(){
        return ($(".modal").data('bs.modal') || {})._isShown;
    }
}