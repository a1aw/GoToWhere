//GTW Map source code

define(function (require, exports, module) {
    var config = require("gtw-config");

    exports.init = function () {
        return new Promise((resolve, reject) => {
            //Required callback function from the API
            window.initMap = function () {
                exports.map = new google.maps.Map(document.getElementById("gtw-map"), {
                    center: { lat: 22.25, lng: 114.1667 },
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
});