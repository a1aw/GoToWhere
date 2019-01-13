//OpenETA Location Manager

const LOCATION_MANAGER_CONVENTION_KEY = "openeta-location-convention";

const CONVENTION_ASK_EVERYTIME = "CONVENTION_ASK_EVERYTIME";
const CONVENTION_CUSTOM_LOCATION = "CONVENTION_CUSTOM_LOCATION";
const CONVENTION_ASK_LOCATION_ACCESS = "CONVENTION_ASK_LOCATION_ACCESS";
const CONVENTION_DIRECT_LOCATION_ACCESS = "CONVENTION_DIRECT_LOCATION_ACCESS";
const ERROR_NOT_SUPPORTED = 0;
const ERROR_NO_ACCESS = 1;

var LocationManager = function () {

	this.watchId = 0;

	this.currentPosition = 0;

	this.currentLocationMarker = 0;

	this.getConvention = function () {
		var localStorage = window.localStorage;
		if (!localStorage || !localStorage.getItem(LOCATION_MANAGER_CONVENTION_KEY)) {
			return CONVENTION_ASK_EVERYTIME;
		}
		return localStorage.getItem(LOCATION_MANAGER_CONVENTION_KEY);
	}

	this.setConvention = function (convention) {
		var localStorage = window.localStorage;
		if (!localStorage) {
			return;
		}
		localStorage.setItem(LOCATION_MANAGER_CONVENTION_KEY, convention);
	}

	this.requestLocationAccess = function (successFunc = function () { }, errorFunc = function () { }) {
		if (!navigator.geolocation) {
			errorFunc(ERROR_NOT_SUPPORTED);
			return;
		}

		var global = this;

		navigator.geolocation.getCurrentPosition(function (position) {
			this.currentPosition = {
				lat: position.coords.latitude,
				lng: position.coords.longitude
			};

			this.currentLocationMarker = new google.maps.Marker({
				position: this.currentPosition,
				map: map,
				icon: "img/human.png"
			});

			map.setCenter(this.currentPosition);
			map.setZoom(16);

			this.watchId = navigator.geolocation.watchPosition(
				global.onPositionChangeSuccess,
				global.onPositionChangeError,
				{
				    enableHighAccuracy: false,
				    timeout: 5000,
				    maximumAge: 0
				}
			);

			successFunc(this.currentPosition);
		}, function () {
			errorFunc(ERROR_NO_ACCESS);
		});
	}

	this.getCurrentPosition = function () {
		return this.currentPosition;
	}

	this.onPositionChangeSuccess = function (position) {
		this.currentPosition = {
			lat: position.coords.latitude,
			lng: position.coords.longitude
		};
		currentLocationMarker.setPosition(this.currentPosition);
	}

	this.onPositionChangeError = function (error) {
		alert("TODO: Handle Position error!")
	}

}