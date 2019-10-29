//GTW Map source code

import config from './gtw-config';

export var map = false;

export function init() {
    return new Promise((resolve, reject) => {
        require(["gtw-map-" + config.mapApi], function (m) {
            map = m;
            map.init().then(function () {
                resolve();
            });
        });
    });
}

export function setCenter(coords) {
    return map.setCenter(coords);
}

export function setZoom(zoom) {
    return map.setZoom(zoom);
}

export function addMarker(position, title, label) {
    return map.addMarker(position, title, label);
}

export function removeMarker(markerId) {
    return map.removeMarker(markerId);
}

export function removeAllMarkers() {
    return map.removeAllMarkers();
}

export function addInfoWindow(markerId, content, open = false) {
    return map.addInfoWindow(markerId, content, open);
}

export function addPolyline(coords, strokeColor, strokeWeight, strokeOpacity = 1.0, geodesic = true) {
    return map.addPolyline(coords, strokeColor, strokeWeight, strokeOpacity, geodesic);
}

export function removePolyline(polylineId) {
    return map.removePolyline(polylineId);
}

export function removeAllPolylines() {
    return map.removeAllPolylines();
}

export function fitBounds(bounds) {
    return map.fitBounds(bounds);
}