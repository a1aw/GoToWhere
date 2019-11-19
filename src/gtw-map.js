//GTW Map source code

import config from './gtw-config';

export var map = false;

export function init() {
    return new Promise((resolve, reject) => {
        import(`./gtw-map-${config.mapApi}`).then(function (m) {
            map = m;
            window.k = map;
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

export function addMarker(position, options) {
    return map.addMarker(position, options);
}

export function setMarkerPosition(markerId, position) {
    return map.setMarkerPosition(markerId, position);
}

export function lockMarker(markerId) {
    return map.lockMarker(markerId);
}

export function unlockMarker(markerId) {
    return map.unlockMarker(markerId);
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

export function lockPolyline(polylineId) {
    return map.lockPolyline(polylineId);
}

export function unlockPolyline(polylineId) {
    return map.unlockPolyline(polylineId);
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