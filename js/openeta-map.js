// OpenETA Map source code

const _googleMapScript = "https://maps.googleapis.com/maps/api/js?key=AIzaSyBhdPFdLWLv5e4ozXpa8p7CVHrX_99BxWo&callback=initMap";
var map;

$(document).ready(function () {
	var node = document.createElement("script");
	node.src = _googleMapScript;
	document.head.appendChild(node);
})

function initMap() {
	map = new google.maps.Map(document.getElementById('map'), {
		center: { lat: 22.25, lng: 114.1667 },
		zoom: 12
	});
}