//OpenETA Event Manager

var UIManager = function () {

	this.home = function () {
		$(".modal-header").html("<h5 class=\"modal-title\">OpenETA</h5>");

		$(".modal-footer").html(
			"<p style=\"text-align: center\">Licensed under MIT License. This software is only for educational purpose, and cannot be used in commerical or practical purposes.</p>"
		);

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