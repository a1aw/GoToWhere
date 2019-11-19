//GTW Map source code

import config from './gtw-config';
import * as loc from './gtw-location';

var markerInc = 1;
var markers = {};
var lockedMarkers = [];

var infoWindowInc = 1;
var infoWindows = {};

var polylineInc = 1;
var polylines = {};
var lockedPolylines = [];

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
            initDarkMode();
            checkIfDarkMode();
            resolve();
            delete window.initMap;
        };

        var apiKey = config.googleMapApiKey;

        if (!window.location.origin || window.location.origin === "" || window.location.origin !== "https://www.gotowhere.ga" || window.location.origin === "file://" || window.location.origin.startsWith("http://localhost") || window.location.origin.startsWith("https://localhost")) {
            apiKey = "";
            console.warn("gtw-map-googlemap: You are running the application in local/no-origin mode. The API key has been removed now.");
        }

        var element = document.createElement("script");
        element.src = "https://maps.googleapis.com/maps/api/js?callback=initMap&key=" + apiKey;
        document.head.appendChild(element);
    });
}

function initDarkMode() {
    var darkModeMapType = new google.maps.StyledMapType([
        { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
        {
            featureType: 'administrative.locality',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }]
        },
        {
            featureType: 'poi',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }]
        },
        {
            featureType: 'poi.park',
            elementType: 'geometry',
            stylers: [{ color: '#263c3f' }]
        },
        {
            featureType: 'poi.park',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#6b9a76' }]
        },
        {
            featureType: 'road',
            elementType: 'geometry',
            stylers: [{ color: '#38414e' }]
        },
        {
            featureType: 'road',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#212a37' }]
        },
        {
            featureType: 'road',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#9ca5b3' }]
        },
        {
            featureType: 'road.highway',
            elementType: 'geometry',
            stylers: [{ color: '#746855' }]
        },
        {
            featureType: 'road.highway',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#1f2835' }]
        },
        {
            featureType: 'road.highway',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#f3d19c' }]
        },
        {
            featureType: 'transit',
            elementType: 'geometry',
            stylers: [{ color: '#2f3948' }]
        },
        {
            featureType: 'transit.station',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }]
        },
        {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#17263c' }]
        },
        {
            featureType: 'water',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#515c6d' }]
        },
        {
            featureType: 'water',
            elementType: 'labels.text.stroke',
            stylers: [{ color: '#17263c' }]
        }
    ]);
    map.mapTypes.set("dark_mode", darkModeMapType);
}

export function setDarkMode(dark) {
    if (dark) {
        map.setMapTypeId("dark_mode");
    } else {
        map.setMapTypeId("roadmap");
    }
}

export function checkIfDarkMode() {
    var darkMode = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDarkMode(darkMode);
}

export function setCenter(coords) {
    return map.setCenter(coords);
}

export function setZoom(zoom) {
    return map.setZoom(zoom);
}

export function addMarker(position, options, onClickFunc) {
    var marker = new google.maps.Marker({
        position: position,
        label: options.label,
        title: options.title,
        icon: options.icon,
        map: map
    });
    markers[markerInc] = marker;

    if (onClickFunc) {
        marker.addListener("click", function () {
            onClickFunc();
        });
    }

    return markerInc++;
}

export function setMarkerPosition(markerId, position) {
    if (!markerId || !markers[markerId]) {
        return false;
    }
    markers[markerId].setPosition(position);
}

export function getMarker(markerId) {
    if (!markerId || !markers[markerId]) {
        return false;
    }
    return markers[markerId];
}

export function lockMarker(markerId) {
    if (!markerId || !markers[markerId]) {
        return false;
    }
    if (lockedMarkers.indexOf(markerId) === -1) {
        lockedMarkers.push(markerId);
    }
    return true;
}

export function unlockMarker(markerId) {
    var i = lockedMarkers.indexOf(markerId);
    if (i === -1) {
        return false;
    }
    lockedMarkers.splice(i, 1);
    return true;
}

export function removeMarker(markerId) {
    if (!markerId || !markers[markerId]) {
        return false;
    }
    if (lockedMarkers.includes(markerId)) {
        return false;
    }
    markers[markerId].setMap(null);
    delete markers[markerId];
    return true;
}

export function removeAllMarkers() {
    for (var key in markers) {
        if (!lockedMarkers.includes(parseInt(key))) {
            markers[key].setMap(null);
        }
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
        infowindow.open(map, marker);
    });

    if (open) {
        infowindow.open(map, marker);
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

    polyline.setMap(map);

    polylines[polylineInc] = polyline;
    return polylineInc++;
}

export function lockPolyline(polylineId) {
    if (!polyline || !polylines[polylineId]) {
        return false;
    }
    if (lockedPolylines.indexOf(polylineId) === -1) {
        lockedPolylines.push(polylineId);
    }
    return true;
}

export function unlockPolyline(polylineId) {
    var i = lockedPolylines.indexOf(polylineId);
    if (i === -1) {
        return false;
    }
    lockedPolylines.splice(i, 1);
    return true;
}

export function removePolyline(polylineId) {
    if (!polylineId || !polylines[polylineId]) {
        return false;
    }
    if (lockedPolylines.includes(polylineId)) {
        return false;
    }
    polylines[polylineId].setMap(null);
    delete polylines[polylineId];
    return true;
}

export function removeAllPolylines() {
    for (var key in polylines) {
        if (!lockedPolylines.includes(key)) {
            polylines[key].setMap(null);
        }
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