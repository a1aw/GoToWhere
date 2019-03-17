//OpenETA Event Manager

const UIMANAGER_FUNC_NEARBY_ROUTE_SELECT = "UIMANAGER_FUNC_NEARBY_ROUTE_SELECT";
const UIMANAGER_FUNC_SAVE_SETTINGS = "UIMANAGER_FUNC_SAVE_SETTINGS";
const UIMANAGER_FUNC_SORT_COMPANY = "UIMANAGER_FUNC_SORT_COMPANY";
const UIMANAGER_FUNC_UNSORT_COMPANY = "UIMANAGER_FUNC_UNSORT_COMPANY";
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
			UIManager.home();
		}
	});

	this.timers = [];

	this.variables = {};

	this.clearUp = function () {
		for (var timer of this.timers) {
			clearInterval(timer);
		}
	}

	this.settings = function () {
		this.clearUp();
		this.variables = {};
		$(".modal-header").html("<h5 class=\"modal-title\">Settings</h5><span style=\"float: right;\"><button class=\"btn btn-default openeta-toolbar-btn\" type=\"button\" onclick=\"UIManager.home();\"><i class=\"fa fa-reply\"></i><span> Return to Home</span></button>");

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
				html += "    </select>"
			} else {
				html += "    <input class=\"form-control\" id=\"openeta-settings-" + setting.key + "\" type=\"";
                if (setting.type == "number") {
                    html += "number";
                } else {
                    html += "text";
                }
				html += "\" value=\"" + val + "\"/>";
			}
			html += "</div>"

		}

		html +=
			"<input type=\"button\" class=\"btn btn-success\" onclick=\"Func.call(UIMANAGER_FUNC_SAVE_SETTINGS, true);\" value=\"Save & Close\"/> " +
			"<input type=\"button\" class=\"btn btn-default\" onclick=\"Func.call(UIMANAGER_FUNC_SAVE_SETTINGS, false);\" value=\"Apply\"/>";

		$(".modal-body").html(html);

		$(".modal-footer").html(
			"<p style=\"text-align: center\">Licensed under MIT License. This software is only for educational purpose, and cannot be used in commerical or practical purposes.</p>"
		);
	};

	this.home = function () {
		this.clearUp();
		this.variables = {};
		$(".modal-header").html("<h5 class=\"modal-title\">OpenETA</h5><span style=\"float: right;\"><button class=\"btn btn-default openeta-toolbar-btn\" type=\"button\" onclick=\"UIManager.settings();\"><i class=\"fa fa-gear\"></i><span> Settings</span></button></span>");

		$(".modal-footer").html(
			"<p style=\"text-align: center\">Licensed under MIT License. This software is only for educational purpose, and cannot be used in commerical or practical purposes.</p>"
		);

		var pos = map.getCenter();
		var providers = ETAManager.getProviders();

		if (providers.length == 0) {
			$(".modal-body").html(
				"<div style=\"text-align: center\">" +
				"<h5>You have no plugins providing transit, ETA information!</h5>" +
				"<p>The application needs transit data from plugins to run! You can try to search for <b>openeta-plugin</b> in GitHub to find any plugins supporting OpenETA.</p>" +
				"</div>"
			);
		} else {
			$(".modal-body").html("");

			$(".modal-body").append("<hr />")

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

			$(".modal-body").append(buttonScroll);
			
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

				$(".modal-body").append(
					"<div class=\"alert alert-warning alert-dismissable\">" +
					"<button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-hidden=\"true\" >&#215;</button>" +
					"No routes " + (range * 1000) + "m nearby! The following routes are in " + Math.ceil(testRange * 1000) + " m range." +
					"</div>"
				);
			}

			$(".modal-body").append(
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
					"    <td><i class=\"fa fa-arrow-right\"></i></td>" +
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
		
	}

	this.setModal = function (header, body, footer) {
		$(".modal-header").html(header);
		$(".modal-body").html(body);
		$(".modal-footer").html(footer);
	}

	this.show = function (lock = false, options = {}) {
		if (lock) {
			options.backdrop = "static";
			options.keyboard = false;
		}
		$(".modal").modal(options);
		EventManager.dispatchEvent(EVENTS.EVENT_UI_SHOW);
	}

	this.hide = function () {
		$(".modal").modal("hide");
		EventManager.dispatchEvent(EVENTS.EVENT_UI_HIDE);
	}

    this.isShown = function(){
        return ($(".modal").data('bs.modal') || {})._isShown;
    }
}