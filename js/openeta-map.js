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

	this.removeAll = function () {
		for (var marker of this.markers) {
			marker.setMap(null);
		}
		for (var path of this.paths) {
			path.setMap(null);
		}
		this.markers = [];
		this.paths = [];
	}

	this.showStopInfo = function (marker) {
		var content = 
			marker.stop.stopId + ": " + marker.stop.stopNameEng +
			"<br /><a href=\"#\" onclick=\"OpenETAMap.returnHome()\">Return</a>";
		var iw = new google.maps.InfoWindow({
			content: content
		});
		iw.open(map, marker);
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
				this.showStopInfo(marker);
				map.setCenter(coord);
				map.setZoom(18);
			}

			marker.addListener('click', function () {
				OpenETAMap.showStopInfo(this);
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