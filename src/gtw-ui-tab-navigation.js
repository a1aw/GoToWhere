import * as selectLoc from './gtw-ui-select-location';
import * as Loc from './gtw-location';
import * as gtfs from './gtw-citydata-transit-gtfs';
import * as Lang from './gtw-lang';
import * as Map from './gtw-map';

var fromPos = false;
var fromName = false;
var toPos = false;
var toName = false;
var updateEtaTimer = false;

async function selectFromLocation() {
    if (fromPos) {
        Map.setZoom(18);
        Map.setCenter(fromPos);
    }
    var pos = await selectLoc.select();
    if (pos) {
        fromPos = pos;
        fromName = await posToName(pos);
        $(".from-location-field").val(fromName);
        if (fromPos && toPos) {
            $(".loading-overlay").fadeIn(1000);
            await searchNavigation();
            $(".loading-overlay").fadeOut(1000);
        }
    }

    Map.setCenter(Loc.getCurrentPosition());
    Map.setZoom(16);
}

async function selectToLocation() {
    if (toPos) {
        Map.setZoom(18);
        Map.setCenter(toPos);
    }
    var pos = await selectLoc.select();
    if (pos) {
        toPos = pos;
        toName = await posToName(pos);
        $(".to-location-field").val(toName);
        if (fromPos && toPos) {
            $(".loading-overlay").fadeIn(1000);
            await searchNavigation();
            $(".loading-overlay").fadeOut(1000);
        }
    }

    Map.setCenter(Loc.getCurrentPosition());
    Map.setZoom(16);
}

async function searchNavigation() {
    clearInterval(updateEtaTimer);
	
    console.log("peform search");
    var st = Date.now();
    var navigationResults = await gtfs.navigate(fromPos, toPos, 0.5);
    console.log(navigationResults);
    console.log("Used: " + (Date.now() - st));
    var html = "<ul class=\"list-group\">";

    var distance;
    var agency;

    for (var result of navigationResults) {
        distance = Math.round((result.startDistance + result.endDistance) * 1000);
        agency = await gtfs.getAgency(result.route["package"], result.route["provider"], result.route["agency_id"]);

        html +=
            "    <li class=\"list-group-item list-group-item-action d-flex justify-content-between align-items-center route-selection\" data-gtw-package=\"" + result.route["package"] + "\" data-gtw-provider=\"" + result.route["provider"] + "\" data-gtw-agency=\"" + result.route["agency_id"] + "\" data-gtw-route-id=\"" + result.route["route_id"] + "\" data-gtw-path-id=\"" + result.pathId + "\" data-gtw-start-stop-id=\"" + result.startStop["stop_id"] + "\" data-gtw-end-stop-id=\"" + result.endStop["stop_id"] + "\">" +
            "        <div class=\"d-flex flex-column route-id\">" +
            "            <div>" + Lang.localizedKey(agency, "agency_short_name") + "</div>" +
            "            <div>" + Lang.localizedKey(result.route, "route_short_name") + "</div>" +
            "        </div>" +
            "        <div class=\"d-flex flex-column stop-info mr-auto\">" +
            "            <div>" +
            "                " + gtfs.selectAgencyStopName(agency["agency_id"], Lang.localizedKey(result.startStop, "stop_name")) + " <i class=\"fas fa-arrow-right\"></i> " + gtfs.selectAgencyStopName(agency["agency_id"], Lang.localizedKey(result.endStop, "stop_name")) +
            "            </div>" +
            "            <div>" + $.i18n("navigate-walk-distance", distance) +
            "            </div>" +
            "        </div>" +
            "    </li>";
    }

    html += "</ul>";
    $(".navigation-results").html(html);

    //updateEta();
    //updateEtaTimer = setInterval(updateEta, 30000);
}

export function enable() {
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

    var itemListHtml =
        "<div class=\"row item-list navigation-results\">" +
        "</div>"
        ;
    $(".content-panel-container").html(itemListHtml);

    if (Loc.isLocated()) {
        var currentLoc = Loc.getCurrentPosition();
        fromPos = currentLoc;
        posToName(currentLoc).then(fromName => {
            $(".from-location-field").val(fromName);
        });
    }

    $(".from-location-field").on("click", selectFromLocation);

    $(".to-location-field").on("click", selectToLocation);
}

export function disable() {
	clearInterval(updateEtaTimer);
    fromPos = false;
    fromName = false;
    toPos = false;
    toName = false;
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