import * as UI from './gtw-ui';
import * as Map from './gtw-map';
import * as Event from './gtw-event';

var selectedLocation = false;
var marker = false;
var eventCenterChgListener = false;

function show(text) {
    selectedLocation = false;

    Map.removeAllMarkers();
    Map.removeAllPolylines();

    if (eventCenterChgListener) {
        Event.removeListener(Event.EVENTS.EVENT_MAP_CENTER_CHANGED, eventCenterChgListener);
        eventCenterChgListener = false;
    }

    var center = Map.getCenter();
    marker = Map.addMarker(center);
    Event.addListener(Event.EVENTS.EVENT_MAP_CENTER_CHANGED, eventCenterChgListener = function(loc) {
        Map.setMarkerPosition(marker, loc);
    });

    $(".ui-pull-up-btn").css("display", "none");
    $(".ui-pull-down-btn").css("display", "none");
    $(".mobile-split-container").css("height", "20%");
    $(".split-map-container").html("");

    if (!text) {
        text = $.i18n("location-move-to-desired-location");
    }

    var tabPanelHtml =
        "<div class=\"text-center\">" +
        "    <p class=\"lead\">" + text + "</p>" +
        "    <button class=\"btn btn-block btn-success location-move-confirm\" type=\"button\">" + $.i18n("location-move-to-desired-location-confirm-btn") + "</button>" +
        "</div>"
        ;
    $(".split-map-tab-panel").html(tabPanelHtml);

    $(".location-move-confirm").on("click", function () {
        selectedLocation = Map.getCenter();
        Event.dispatchEvent(Event.EVENTS.EVENT_LOCATION_SELECTED, selectedLocation);
        UI.showPanel();
    });

    UI.hidePanel();
}

export async function select(text) {
    show(text);
    var selectedListener;
    var backListener;
    var val = await new Promise((resolve, reject) => {
        Event.addListener(Event.EVENTS.EVENT_LOCATION_SELECTED, selectedListener = function (loc) {
            resolve(loc);
        });
        Event.addListener(Event.EVENTS.EVENT_UI_BACK, backListener = function () {
            resolve(false);
        });
    });
    Event.removeListener(Event.EVENTS.EVENT_LOCATION_SELECTED, selectedListener);
    Event.removeListener(Event.EVENTS.EVENT_UI_BACK, backListener);
    Event.removeListener(Event.EVENTS.EVENT_MAP_CENTER_CHANGED, eventCenterChgListener);
    eventCenterChgListener = false;
    Map.removeMarker(marker);
    return val;
}

export function getSelectedLocation() {
    return selectedLocation;
}