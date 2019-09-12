//GTW Location Manager

define(function (require, exports, module) {
    const LOCATION_MANAGER_CONVENTION_KEY = "openeta-location-convention";

    const CONVENTION_ASK_EVERYTIME = "CONVENTION_ASK_EVERYTIME";
    const CONVENTION_CUSTOM_LOCATION = "CONVENTION_CUSTOM_LOCATION";
    const CONVENTION_ASK_LOCATION_ACCESS = "CONVENTION_ASK_LOCATION_ACCESS";
    const CONVENTION_DIRECT_LOCATION_ACCESS = "CONVENTION_DIRECT_LOCATION_ACCESS";
    exports.ERROR_NOT_SUPPORTED = 0;
    exports.ERROR_NO_ACCESS = 1;

    exports.watchId = 0;

    exports.currentPosition = 0;

    exports.currentLocationMarker = 0;

    exports.getConvention = function () {
        var localStorage = window.localStorage;
        if (!localStorage || !localStorage.getItem(LOCATION_MANAGER_CONVENTION_KEY)) {
            return CONVENTION_ASK_EVERYTIME;
        }
        return localStorage.getItem(LOCATION_MANAGER_CONVENTION_KEY);
    }

    exports.setConvention = function (convention) {
        var localStorage = window.localStorage;
        if (!localStorage) {
            return;
        }
        localStorage.setItem(LOCATION_MANAGER_CONVENTION_KEY, convention);
    }

    exports.requestLocationAccess = function (successFunc = function () { }, errorFunc = function () { }) {
        if (!navigator.geolocation) {
            errorFunc(ERROR_NOT_SUPPORTED);
            return;
        }

        var global = this;

        navigator.geolocation.getCurrentPosition(function (position) {
            global.currentPosition = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            global.currentLocationMarker = new google.maps.Marker({
                position: global.currentPosition,
                map: map,
                icon: _urlPrefix + "img/human.png"
            });

            map.setCenter(global.currentPosition);
            map.setZoom(16);

            global.watchId = navigator.geolocation.watchPosition(
                function (p) { global.onPositionChangeSuccess(p) },
                function (e) { global.onPositionChangeError(e) },
                {
                    enableHighAccuracy: false,
                    timeout: 5000,
                    maximumAge: 0
                }
            );

            successFunc(global.currentPosition);
        }, function () {
            errorFunc(ERROR_NO_ACCESS);
        });
    }

    exports.getCurrentPosition = function () {
        return exports.currentPosition;
    }

    exports.onPositionChangeSuccess = function (position) {
        exports.currentPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
        };
        exports.currentLocationMarker.setPosition(exports.currentPosition);
    }

    exports.onPositionChangeError = function (error) {
        alert("TODO: Handle Position error!")
    }
});