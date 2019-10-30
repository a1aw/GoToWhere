//GTW Map source code

import config from './gtw-config';
import * as loc from './gtw-location';

var markerInc = 1;
var markers = {};

var infoWindowInc = 1;
var infoWindows = {};

var polylineInc = 1;
var polylines = {};

export var map = false;

export function init() {
    return new Promise((resolve, reject) => {
        $("#gtw-map").html("<div id=\"gmap\" style=\"width: 100%; height: 100%;\"></div>");
        //Required callback function from the API
        window.initMap = function () {
            map = new google.maps.Map(document.getElementById("gmap"), {
                center: loc.getCurrentPosition(),
                zoom: 12,
                disableDefaultUI: true
            });
            resolve();
            delete window.initMap;
        };

        var apiKey = config.googleMapApiKey;

        if (!window.location.origin || window.location.origin === "" || window.location.origin === "file://" || window.location.origin.startsWith("http://localhost") || window.location.origin.startsWith("https://localhost")) {
            apiKey = "";
            console.warn("gtw-map-googlemap: You are running the application in local/no-origin mode. The API key has been removed now.");
        }

        var element = document.createElement("script");
        element.src = "https://maps.googleapis.com/maps/api/js?callback=initMap&key=" + apiKey;
        document.head.appendChild(element);
    });
}

export function setCenter(coords) {
    return map.setCenter(coords);
}

export function setZoom(zoom) {
    return map.setZoom(zoom);
}

export function addMarker(position, title, label, onClickFunc) {
    var marker = new google.maps.Marker({
        position: position,
        label: label,
        title: title,
        map: exports.map
    });
    markers[markerInc] = marker;

    if (onClickFunc) {
        marker.addListener("click", function () {
            onClickFunc();
        });
    }

    return markerInc++;
}

export function getMarker(markerId) {
    if (!markerId || !markers[markerId]) {
        return false;
    }
    return markers[markerId];
}

export function removeMarker(markerId) {
    if (!markerId || !markers[markerId]) {
        return false;
    }
    markers[markerId].setMap(null);
    delete markers[markerId];
    return true;
}

export function removeAllMarkers() {
    for (var key in markers) {
        markers[key].setMap(null);
    }
    markers = {};
    return true;
}

export function addInfoWindow(markerId, content, open = false) {
    var marker = egetMarker(markerId);
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

export function addPolyline(coords, strokeColor, strokeWeight, strokeOpacity = 1.0, geodesic = true) {
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

export function removePolyline(polylineId) {
    if (!polylineId || !polylines[polylineId]) {
        return false;
    }
    polylines[polylineId].setMap(null);
    delete polylines[polylineId];
    return true;
}

export function removeAllPolylines() {
    for (var key in polylines) {
        polylines[key].setMap(null);
    }
    polylines = {};
    return true;
}

export function fitBounds(bounds) {
    var out = new google.maps.LatLngBounds();
    for (var bound of bounds) {
        out.extend(bound);
    }
    map.fitBounds(out);
}