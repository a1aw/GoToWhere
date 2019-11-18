//GTWP HK Transit Plugin

import * as Cors from '../../gtw-cors';
import * as Transit from '../../gtw-citydata-transit';
import JSZip from 'jszip';
import JSZipUtils from 'jszip-utils';
window.JSZip = JSZip;
window.JSZipUtils = JSZipUtils;

function parseIsoDatetime(dtstr) {
    var dt = dtstr.split(/[: T-]/).map(parseFloat);
    return new Date(dt[0], dt[1] - 1, dt[2], dt[3] || 0, dt[4] || 0, dt[5] || 0, 0);
}

export function onload() {
    Cors.register("db.kmbeta.ml", true);
    Transit.registerProvider("gtwp-hktransit", "hktransit", new HkTransitGtfsProvider());
    return true;
};

var HkTransitGtfsProvider = function () {

    this.checkDatabaseUpdate = function (resolve, reject, localVer) {
        $.ajax({
            url: "https://db.kmbeta.ml/hktransit_gtfs-version.json",
            cache: false,
            dataType: "json",
            success: function (data) {
                var lastUpdatedInt;
                var localVerInt;
                try {
                    lastUpdatedInt = parseInt(data.version);
                    localVerInt = parseInt(localVer);
                } catch (err) {
                    console.error("Error: Could not parse hktransit_gtfs last updated time or cached version! Forcing to be no update");
                    resolve(false);
                }
                resolve(lastUpdatedInt > localVerInt);
            },
            error: function (err) {
                console.error("Error: Could not check hktransit_gtfs update!");
                resolve(false);
            }
        });
    };

    this.fetchDatabase = function (resolve, reject) {
        JSZipUtils.getBinaryContent("https://db.kmbeta.ml/hktransit_gtfs.zip", function (err, data) {
            if (err) {
                console.error(err);
                reject(err);
                return;
            }
            var zip = new JSZip();
            zip.loadAsync(data).then(resolve);
        });
    };

};