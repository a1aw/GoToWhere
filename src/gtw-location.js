//GTW Location Manager

import * as Map from './gtw-map';
import * as Event from './gtw-event';

const LOCATION_MANAGER_CONVENTION_KEY = "openeta-location-convention";

const CONVENTION_ASK_EVERYTIME = "CONVENTION_ASK_EVERYTIME";
const CONVENTION_CUSTOM_LOCATION = "CONVENTION_CUSTOM_LOCATION";
const CONVENTION_ASK_LOCATION_ACCESS = "CONVENTION_ASK_LOCATION_ACCESS";
const CONVENTION_DIRECT_LOCATION_ACCESS = "CONVENTION_DIRECT_LOCATION_ACCESS";

export var watchId = 0;

export var markerId = 0;

export var currentPosition = { lat: 22.2952296, lng: 114.1766577 };

var located = false;

var error = false;

export function getConvention() {
    var localStorage = window.localStorage;
    if (!localStorage || !localStorage.getItem(LOCATION_MANAGER_CONVENTION_KEY)) {
        return CONVENTION_ASK_EVERYTIME;
    }
    return localStorage.getItem(LOCATION_MANAGER_CONVENTION_KEY);
}

export function setConvention(convention) {
    var localStorage = window.localStorage;
    if (!localStorage) {
        return;
    }
    localStorage.setItem(LOCATION_MANAGER_CONVENTION_KEY, convention);
}

export function requestLocationAccess(successFunc = function () { }, errorFunc = function () { }) {
    if (!navigator.geolocation) {
        errorFunc(ERROR_NOT_SUPPORTED);
        return;
    }

    var global = this;

    navigator.geolocation.getCurrentPosition(function (position) {
        located = true;
        currentPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
        };

        Map.setCenter(currentPosition);
        Map.setZoom(16);

        markerId = Map.addMarker(currentPosition, {
            icon: "img/star.png"
        });
        Map.lockMarker(markerId);

        watchId = navigator.geolocation.watchPosition(
            onPositionChangeSuccess,
            onPositionChangeError,
            {
                enableHighAccuracy: false,
                timeout: 5000,
                maximumAge: 0
            }
        );
        Event.dispatchEvent(Event.EVENTS.EVENT_LOCATION_SUCCESS);
        successFunc(currentPosition);
    }, function (err) {
        located = false;
        error = err;
        Event.dispatchEvent(Event.EVENTS.EVENT_LOCATION_ERROR, err);
        errorFunc(err);
    }, { timeout: 10000 });
}

export function isLocated() {
    return located;
}

export function isErrored() {
    return error !== false;
}

export function getError() {
    return error;
}

export function getCurrentPosition() {
    return currentPosition;
}

export function onPositionChangeSuccess(position) {
    currentPosition = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
    };
    located = true;
    error = false;
    Map.setMarkerPosition(markerId, currentPosition);
    Event.dispatchEvent(Event.EVENTS.EVENT_LOCATION_CHANGE, currentPosition);
}

export function onPositionChangeError(err) {
    located = false;
    error = err;
    Event.dispatchEvent(Event.EVENTS.EVENT_LOCATION_ERROR, err);
}