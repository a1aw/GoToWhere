// OpenETA Map source code

var map;

function initMap() {
	map = new google.maps.Map(document.getElementById('map'), {
		center: { lat: 22.25, lng: 114.1667 },
		zoom: 12
	});
}

var OpenETAMap = function () {

	this.markers = [];

	this.paths = [];

	this.infoWindows = [];

	this.removeAll = function () {
		for (var infoWindow of this.infoWindows) {
			infoWindow.close();
		}
		for (var marker of this.markers) {
			marker.setMap(null);
		}
		for (var path of this.paths) {
			path.setMap(null);
		}
		this.infoWindows = [];
		this.markers = [];
		this.paths = [];
	}

	this.showFullStopInfo = function (stopId) {
		var stop = ETAManager.getStopById(stopId);

		if (!stop) {
			UIManager.setModal("Unable to show stop details", "The requested stop was not found. ", "");
			UIManager.show();
			return;
		}

		//TODO: Lang preference
		var stopName = stop.stopNameEng;
		var content =
			"<h3>Details</h3>" +
			"<hr />" +
			"<p>Name (English): " + stop.stopNameEng + "</p>" +
			"<p>Name (Chinese): " + stop.stopNameChi + "</p>" +
			"<p>Address (English): " + stop.addrEng + "</p>" +
			"<p>Address (Chinese): " + stop.addrChi + "</p><br />" +
			"<p>Latitude: " + stop.lat + "</p>" +
			"<p>Longitude: " + stop.lng + "</p>" +
			"<br />" +
			"<h3>Technical Information</h3>" +
			"<hr />" +
			"<p>Unique ID: " + stop.stopId + "</p>" +
			"<p>Transit Type: " + stop.transit + "</p>" +
			"<p>Provider: " + stop.provider.name;

		UIManager.setModal(stopName, content, "<button class=\"btn btn-default\" onclick=\"UIManager.hide()\">Close</button>");
		UIManager.show();
	}

	this.showStopETAInfo = function (marker) {
		var key = marker.route.routeId + "-" + marker.selectedPath + "-" + marker.stop.stopId;
		var stopName = marker.stop.stopNameEng;
		var provider = marker.route.provider;
		//TODO: Lang preference

		var h = provider.makeHandler({
			route: marker.route,
			stop: marker.stop,
			selectedPath: marker.selectedPath
		});

		ETAManager.addHandler(h);

		var prefix =
			"<p>" + stopName + "</p>" +
			"<hr />" + 
			"<div class=\"table-responsive\">" +
			"    <p><u>Estimated Time Arrival</u></p>" +
			"    <table id=\"openeta-map-stopetainfo-" + key + "\" class=\"table openeta-map-stopetainfo\">"
        ;
        var suffix =
			"    </table>" +
			"</div>" +
			"<hr />" +
			"<a href=\"#\" onclick=\"OpenETAMap.showFullStopInfo('" + marker.stop.stopId + "')\">Stop Details</a><br /><a href=\"#\" onclick=\"OpenETAMap.returnHome()\">Return</a>"
		;

		var doneListener = h.fetchETA();
        if (!doneListener) {
			var content = 
				"<tr class=\"table-dark\">" +
				"    <td>Not available to this route</td>" +
				"    <td>---</td>" +
				"</tr>"
			;
		   this.showInfoWindow(marker, prefix + content + suffix);
		} else {
            UIManager.setModal(
               "Requesting",
               "<div class=\"loading-modal\"><img src=\"" + _urlPrefix + "img/loading.gif\" /> Requesting ETA data from plugins...</div>",  
               ""
            );
            if (!UIManager.isShown()){
                UIManager.show();
            }
            var global = this;
			doneListener.done(function () {
                setTimeout(function(){
                    UIManager.hide();
                }, 500);
                var content = "";
				var data = h.getETA();
				if (data.schedules.length == 0) {
					content = 
						"<tr class=\"table-dark\">" +
						"    <td>No schedules pending</td>" +
						"    <td>---</td>" +
						"</tr>"
                    ;
				} else {
                    var active = false;
				    for (var schedule of data.schedules) {
					    var eta = schedule.getRemainingMinutes(data.serverTime);
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
					    	html += "danger"
					    } else {
					    	html += "dark";
					    }

					    if (!active && schedule.isLive && eta > 0) {
					    	active = true;
					    	html += " active";
					    }

					    html += "\"><td>";

				    	//TODO: isOutdated

				    	if (schedule.hasMsg) {
				    		html += schedule.msg;
				    	}
				    	if (schedule.hasTime) {
					    	if (schedule.hasMsg) {
					    		html += "<br />";
					    	}
					    	if (eta > 1) {
					    		html += eta + " mins";
					    	} else if (eta == 1) {
					    		html += eta + " min";
					    	} else {
					    		html += "Arrived/Left";
					    	}
				    	}

					    if (schedule.isLive) {
					    	html += " <span style=\"color: red; float: right; font-size: 10px;\"><i class=\"fa fa-circle\"></i> Live</span>";
				    	} else {
				    		html += " <span style=\"font-size: 10px; float: right; font-style: italic;\">Scheduled</span>";
				    	}

				    	html += "</td><td>";

					    if (schedule.hasTime) {
					    	html += Misc.fillZero(schedule.time.hr) + ":" + Misc.fillZero(schedule.time.min);
				    	} else {
				    		html += "---";
					    }

					    html += "</td>";

				    	//TODO: Features
    
				    	html += "</tr>"
				    	content += html;
				    }
                }

                
		        global.showInfoWindow(marker, prefix + content + suffix);
			});
		}
	}

	this.showStopInfo = function (marker) {
		var content =
			marker.stop.stopId + ": " + marker.stop.stopNameEng +
			"<br /><a href=\"#\" onclick=\"OpenETAMap.returnHome()\">Return</a>";
		this.showInfoWindow(marker, content);
	}

	this.showInfoWindow = function (marker, content) {
		var iw = new google.maps.InfoWindow({
			content: content
		});
		iw.open(map, marker);
		this.infoWindows.push(iw);
	}

	this.returnHome = function () {
		this.removeAll();
		map.setCenter(LocationManager.getCurrentPosition());
		map.setZoom(16);
		UIManager.home();
		UIManager.show();
	}

	this.showRoute = function (route, selectedPath, selectedStop = false) {
		var stopCoords = [];
		var path = route.paths[selectedPath];
		var coord;
		var stop;
		var label;
		var marker;
		for (var i = 0; i < path.length; i++) {
			stop = ETAManager.getStopById(path[i]);
			if (!stop) {
				alert("Cannot find " + path[i] + " from database! Skipping");
				continue;
			}

			coord = {
				lat: stop.lat,
				lng: stop.lng
			};

			label = route.routeId + ": " + (i + 1);
			marker = new google.maps.Marker({
				position: coord,
				map: map,
				label: label,
				route: route,
				selectedPath: selectedPath,
				stop: stop
			});

			if (selectedStop && stop.stopId == selectedStop.stopId) {
				this.showStopETAInfo(marker);
				map.setCenter(coord);
				map.setZoom(18);
			}

			marker.addListener('click', function () {
				//OpenETAMap.showStopInfo(this);
				OpenETAMap.showStopETAInfo(this);
			});

			this.markers.push(marker);
			stopCoords.push(coord);
		}

		var path = new google.maps.Polyline({
			path: stopCoords,
			geodesic: true,
			strokeColor: "#bfbfbf",
			strokeOpacity: 1,
			strokeWeight: 4
		});
		path.setMap(map);
		this.paths.push(path);
	}

}