//OpenETA Event Manager

var UIManager = function () {

	this.timers = [];

	this.home = function () {
		$(".modal-header").html("<h5 class=\"modal-title\">OpenETA</h5>");

		$(".modal-footer").html(
			"<p style=\"text-align: center\">Licensed under MIT License. This software is only for educational purpose, and cannot be used in commerical or practical purposes.</p>"
		);

		var pos = map.getCenter();
		console.log(pos)
		var providers = ETAManager.getProviders();

		if (providers.length == 0) {
			$(".modal-body").html(
				"<div style=\"text-align: center\">" +
				"<h5>You have no plugins providing transit, ETA information!</h5>" +
				"<p>The application needs transit data from plugins to run! You can try to search for <b>openeta-plugin</b> in GitHub to find any plugins supporting OpenETA.</p>" +
				"</div>"
			);
		} else {
			$(".modal-body").html(
				"<div class=\"list-group\" id=\"home-nearbystops-listgroup\">" +
				"</div>"
			);

			var lat = pos.lat();
			var lng = pos.lng();
			var range = 0.1;

			var allNearbyStops = ETAManager.getAllStopsNearbyCoord(lat, lng, range);

			var node = $("#home-nearbystops-listgroup");
			node.html("");

			if (allNearbyStops.length <= 0) {
				var testRange = range;
				do {
					testRange += 0.05;
					allNearbyStops = ETAManager.getAllStopsNearbyCoord(lat, lng, testRange);
				} while (allNearbyStops.length <= 0);
				node.append("<p>No routes " + range * 1000 + "m nearby! The following routes are in " + Math.ceil(testRange * 1000) + " m range.</p>");
			}

			var allNearbyRoutes = [];
			for (var stop of allNearbyStops) {
				if (allNearbyRoutes.length >= 20) {
					break;
				}
				var routes = ETAManager.getRoutesOfStop(stop);
				for (var route of routes) {
					allNearbyRoutes.push([route, stop]);
				}
			}

			for (var route of allNearbyRoutes) {
				node.append("<a href=\"#\" onclick=\"\" class=\"list-group-item\"><h5 class=\"list-group-item-heading\">" + route[0].routeId + "</h5><span style=\"float: right\">" + route[0].provider.name + "</span><p class=\"list-group-item-text\" id=\"\">---<br />" + route[1].stopNameEng + "</p></a>");
			}

		}
		EventManager.dispatchEvent(EVENTS.EVENT_UI_HOME);
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
}