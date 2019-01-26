//OpenETA Event Manager

const UIMANAGER_FUNC_NEARBY_ROUTE_SELECT = "UIMANAGER_FUNC_NEARBY_ROUTE_SELECT";
const UIMANAGER_VAR_ALL_NEARBY_ROUTES = "UIMANAGER_VAR_ALL_NEARBY_ROUTES";

var UIManager = function () {

	var global = this;

	Func.registerFunction(UIMANAGER_FUNC_NEARBY_ROUTE_SELECT, function (index) {
		//global.hide();
		var data = global.variables[UIMANAGER_VAR_ALL_NEARBY_ROUTES][index];
		var route = data[0];
		var pathIndex = data[1];
		var selectedStop = data[2];
		OpenETAMap.showRoute(route, pathIndex, selectedStop);
	});

	this.timers = [];

	this.variables = {};

	this.home = function () {
		this.variables = {};
		$(".modal-header").html("<h5 class=\"modal-title\">OpenETA</h5>");

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
				"    <button type=\"button\" class=\"btn btn-primary\"><i class=\"fa fa-reply-all\"></i><br />All</button>";

			for (var provider of providers) {
				var image = "";
				if (provider.transit == TransitType.TRANSIT_BUS) {
					image = "fa-bus";
				} else if (provider.transit == TransitType.TRANSIT_METRO || provider.transit == TransitType.TRANSIT_TRAIN) {
					image = "fa-train";
				} else {
					image = "fa-question";
				}
				buttonScroll += " <button type=\"button\" class=\"btn btn-default\"><i class=\"fa " + image + "\"></i><br />" + provider.name + "</button>";
			}

			buttonScroll += "</div><br />";

			$(".modal-body").append(buttonScroll);
			

			var lat = pos.lat();
			var lng = pos.lng();
			var range = 0.1;

			var allNearbyStops = ETAManager.getAllStopsNearbyCoord(lat, lng, range);

			if (allNearbyStops.length <= 0) {
				var testRange = range;
				do {
					testRange += 0.05;
					allNearbyStops = ETAManager.getAllStopsNearbyCoord(lat, lng, testRange);
				} while (allNearbyStops.length <= 0);

				$(".modal-body").append(
					"<div class=\"alert alert-warning alert-dismissable\">" +
					"<button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-hidden=\"true\" >&#215;</button>" +
					"No routes " + (range * 1000) + "m nearby! The following routes are in " + Math.ceil(testRange * 1000) + " m range." +
					"</div>"
				);
			}

			$(".modal-body").append(
				"<div class=\"list-group\" id=\"home-nearbystops-listgroup\">" +
				"</div>"
			);

			var node = $("#home-nearbystops-listgroup");
			node.html("");

			console.log(allNearbyStops);
			var allNearbyRoutes = [];
			for (var stop of allNearbyStops) {
				if (allNearbyRoutes.length >= 20) {
					break;
				}
				var routes = ETAManager.searchRoutesOfStop(stop);
				for (var route of routes) {
					console.log(route[0].routeId + ", " + route[1] + ", " + stop.stopId);
					allNearbyRoutes.push([route[0], route[1], stop]);
				}
			}
			console.log(allNearbyRoutes);

			var hs = [];

			for (var i = 0; i < allNearbyRoutes.length; i++) {
				var route = allNearbyRoutes[i];
				node.append(
					"<a href=\"#\" onclick=\"Func.call('" + UIMANAGER_FUNC_NEARBY_ROUTE_SELECT + "', " + i + ")\" class=\"list-group-item\">" +
					"    <h5 class=\"list-group-item-heading\">" + route[0].routeId + "</h5>" +
					"    <span style=\"float: right\">" + route[0].provider.name + "</span>" +
					"    <p class=\"list-group-item-text\" id=\"openeta-nearbyeta-" + route[0].provider.name + "-" + route[0].routeId + "-" + route[1] + "-" + route[2].stopId + "\">---</p>" + route[2].stopNameEng + "" +
					"</a>"
				);
				hs.push(route[0].provider.makeHandler({
					route: route[0],
					selectedPath: route[1],
					stop: route[2]
				}));
			}

			hs.forEach(function (h) {
				h.fetchETA().done(function () {
					var text = "";
					var eta = h.getETA();
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
					}
					var node = $("#openeta-nearbyeta-" + h.route.provider.name + "-" + h.route.routeId + "-" + h.selectedPath + "-" + h.stop.stopId);
					node.html(text);
					node.parent().attr("class", "list-group-item list-group-item-" + css)
				});
			});

			this.variables[UIMANAGER_VAR_ALL_NEARBY_ROUTES] = allNearbyRoutes;

		}
		EventManager.dispatchEvent(EVENTS.EVENT_UI_HOME);
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