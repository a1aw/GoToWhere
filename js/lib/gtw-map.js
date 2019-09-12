//GTW Map source code

var map;

function initMap() {
	map = new google.maps.Map(document.getElementById('map'), {
		center: { lat: 22.25, lng: 114.1667 },
		zoom: 12
	});
}

define(function (require, exports, module) {
    var config = require("gtw-config");
});