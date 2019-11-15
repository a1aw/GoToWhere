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
        console.log(localVer);
        resolve(false);
    };

    this.fetchDatabase = function (resolve, reject) {
        JSZipUtils.getBinaryContent("http://localhost:8080/img/hktransit_gtfs.zip", function (err, data) {
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