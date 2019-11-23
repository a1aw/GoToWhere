import * as selectLoc from './gtw-ui-select-location';
import * as Loc from './gtw-location';
import * as gtfs from './gtw-citydata-transit-gtfs';
import * as Lang from './gtw-lang';
import * as Map from './gtw-map';

var fromPos = false;
var fromName = false;
var toPos = false;
var toName = false;

export async function enable() {
    var fromPrepend = $.i18n("location-from-location-short");
    var fromPlaceholder = $.i18n("location-from-location-long");
    var toPrepend = $.i18n("location-to-location-short");
    var toPlaceholder = $.i18n("location-to-location-long");
    var tabPanelHtml =
        "<div class=\"input-group mt-2 mb-2\">" +
        "    <div class=\"input-group-prepend\">" +
        "        <span class=\"input-group-text\" id=\"from-location-text\">" + fromPrepend + "</span>" +
        "    </div>" +
        "    <input type=\"text\" class=\"form-control select-location-field from-location-field\" placeholder=\"" + fromPlaceholder + "\" aria-label=\"" + fromPlaceholder + "\" aria-describedby=\"from-location-text\" readonly>" +
        "</div>" +
        "<div class=\"input-group mb-2\">" +
        "    <div class=\"input-group-prepend\">" +
        "        <span class=\"input-group-text\" id=\"to-location-text\">" + toPrepend + "</span>" +
        "    </div>" +
        "    <input type=\"text\" class=\"form-control select-location-field to-location-field\" placeholder=\"" + toPlaceholder + "\" aria-label=\"" + toPlaceholder + "\" aria-describedby=\"to-location-text\" readonly>" +
        "</div>"
        ;
    $(".tab-panel").html(tabPanelHtml);

    if (Loc.isLocated()) {
        var currentLoc = Loc.getCurrentPosition();
        fromPos = currentLoc;
        fromName = await posToName(currentLoc);
        $(".from-location-field").val(fromName);
    }

    $(".from-location-field").on("click", function () {
        selectFromLocation();
    });

    $(".to-location-field").on("click", function () {
        selectToLocation();
    });
}

async function selectFromLocation() {
    if (fromPos) {
        Map.setCenter(fromPos);
    }
    var pos = await selectLoc.select();
    if (pos) {
        fromPos = pos;
        fromName = await posToName(pos);
        $(".from-location-field").val(fromName);
    }
}

async function selectToLocation() {
    if (toPos) {
        Map.setCenter(toPos);
    }
    var pos = await selectLoc.select();
    if (pos) {
        toPos = pos;
        toName = await posToName(pos);
        $(".to-location-field").val(toName);
    }
}

export function disable(){
	console.log("Call disable");
}

async function posToName(pos) {
    var nearbyStops = await gtfs.searchNearbyStops(pos.lat, pos.lng, 1, true);
    if (nearbyStops.length > 0) {
        var localizedName = Lang.localizedKey(nearbyStops[0].stop, "stop_name");
        return gtfs.selectFirstAgencyStopName(localizedName);
    } else {
        return (Math.round(pos.lat * 10000000) / 10000000) + ", " + (Math.round(pos.lng * 10000000) / 10000000);
    }
}