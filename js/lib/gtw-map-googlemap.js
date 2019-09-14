//GTW Map source code

define(function (require, exports, module) {
    var config = require("gtw-config");
    var loc = require("gtw-location");

    var markerInc = 1;
    var markers = {};

    var infoWindowInc = 1;
    var infoWindows = {};

    var polylineInc = 1;
    var polylines = {};

    exports.init = function () {
        return new Promise((resolve, reject) => {
            //Required callback function from the API
            window.initMap = function () {
                exports.map = new google.maps.Map(document.getElementById("gtw-map"), {
                    center: loc.getCurrentPosition(),
                    zoom: 12
                });
                resolve();
                delete window.initMap;
            };

            requirejs.config({
                paths: {
                    "google-map": "https://maps.googleapis.com/maps/api/js?callback=initMap&key=" + config.googleMapApiKey
                }
            });

            requirejs(["google-map"]);
        });
    };

    exports.setCenter = function (coords) {
        return exports.map.setCenter(coords);
    };

    exports.setZoom = function (zoom) {
        return exports.map.setZoom(zoom);
    };

    exports.addMarker = function (position, title, label) {
        var marker = new google.maps.Marker({
            position: position,
            label: label,
            title: title,
            map: exports.map
        });
        markers[markerInc] = marker;
        return markerInc++;
    };

    exports.getMarker = function (markerId) {
        if (!markerId || !markers[markerId]) {
            return false;
        }
        return markers[markerId];
    }

    exports.removeMarker = function (markerId) {
        if (!markerId || !markers[markerId]) {
            return false;
        }
        markers[markerId].setMap(null);
        delete markers[markerId];
        return true;
    }

    exports.removeAllMarkers = function () {
        for (var key in markers) {
            markers[key].setMap(null);
        }
        markers = {};
        return true;
    }

    exports.addInfoWindow = function (markerId, content, open = false) {
        var marker = exports.getMarker(markerId);
        if (!marker) {
            return false;
        }

        var infowindow = new google.maps.InfoWindow({
            content: content
        });

        marker.addListener("click", function () {
            infowindow.open(exports.map, marker);
        });

        if (open) {
            infowindow.open(exports.map, marker);
        }

        infoWindows[infoWindowInc] = infowindow;
        return infoWindowInc++;
    }

    exports.addPolyline = function (coords, strokeColor, strokeWeight, strokeOpacity = 1.0, geodesic = true) {
        var polyline = new google.maps.Polyline({
            path: coords,
            geodesic: geodesic,
            strokeColor: strokeColor,
            strokeOpacity: strokeOpacity,
            strokeWeight: strokeWeight
        });

        polyline.setMap(exports.map);

        polylines[polylineInc] = polyline;
        return polylineInc++;
    }

    exports.removePolyline = function (polylineId) {
        if (!polylineId || !polylines[polylineId]) {
            return false;
        }
        polylines[polylineId].setMap(null);
        delete polylines[polylineId];
        return true;
    }

    exports.removeAllPolylines = function () {
        for (var key in polylines) {
            polylines[key].setMap(null);
        }
        polylines = {};
        return true;
    }

});