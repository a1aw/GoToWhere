//GTW Map source code

define(function (require, exports, module) {
    var config = require("gtw-config");

    exports.init = function () {
        return new Promise((resolve, reject) => {
            require(["gtw-map-" + config.mapApi], function (map) {
                exports.map = map;
                map.init().then(function () {
                    resolve();
                });
            });
        });
    };

    exports.setCenter = function (coords) {
        return exports.map.setCenter(coords);
    };

    exports.setZoom = function (zoom) {
        return exports.map.setZoom(zoom);
    };

    exports.addMarker = function (position, title, label) {
        return exports.map.addMarker(position, title, label);
    };

    exports.removeMarker = function (markerId) {
        return exports.map.removeMarker(markerId);
    }

    exports.removeAllMarkers = function () {
        return exports.map.removeAllMarkers();
    }

    exports.addInfoWindow = function (markerId, content, open = false) {
        return exports.map.addInfoWindow(markerId, content, open);
    }

    exports.addPolyline = function (coords, strokeColor, strokeWeight, strokeOpacity = 1.0, geodesic = true) {
        return exports.map.addPolyline(coords, strokeColor, strokeWeight, strokeOpacity, geodesic);
    }

    exports.removePolyline = function (polylineId) {
        return exports.map.removePolyline(polylineId);
    }

    exports.removeAllPolylines = function () {
        return exports.map.removeAllPolylines();
    }

});