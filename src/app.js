// GoToWhere startup script

import $ from 'jquery';
window.jQuery = $;
window.$ = $;
import JSZip from 'jszip';
import JSZipUtils from 'jszip-utils';
window.JSZip = JSZip;
window.JSZipUtils = JSZipUtils;

var req = require.context("@wikimedia/jquery.i18n/src");

var files = ["js", "messagestore", "fallbacks", "parser", "emitter", "language"];
files.forEach(function (module) {
    req("./jquery.i18n." + module);
});

import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './style.css';
import './timeline.css';

import 'smartwizard';
import 'smartwizard/dist/css/smart_wizard.css';

import '@fortawesome/fontawesome-free/js/fontawesome';
import '@fortawesome/fontawesome-free/js/solid';
import '@fortawesome/fontawesome-free/js/regular';
import '@fortawesome/fontawesome-free/js/brands';

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').then(registration => {
            console.log('SW registered: ', registration);
        }).catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
        });
    });
}

var __headerTexts = ["<i class=\"fas fa-map-marked-alt\"></i> \u53bb\u908a\u35ce GoToWhere", "<i class=\"fas fa-map-marked-alt\"></i> GoToWhere<small>.ga</small>", "<i class=\"fas fa-map-marked-alt\"></i> HeuiBin<small>.ga</small>"];
var __stopHeaderAnimation = false;

function __headerAnimation(i) {
    if (__stopHeaderAnimation) {
        return;
    }

    if (i === undefined || i > 2) {
        i = 0;
    }
    $(".startup h1").html(__headerTexts[i]);
    $(".startup h1").fadeIn(2000, function () {
        $(".startup h1").fadeOut(2000, function () {
            __headerAnimation(i + 1);
        });
    });
}

$(document).ready(function () {
    adjustMargin();
    $(".startup .progress-panel").fadeIn(5000);
    $(".startup .container").fadeIn(2000, function () {
        __headerAnimation();
    });
    console.log("GoToWhere (c) 2019. Licensed under the MIT License.");
    $("#startup-status").html("Loading GoToWhere scripts...");
});

$(window).resize(function () {
    adjustMargin();
});

window.adjustMargin = function () {
    var nph = 0;
    $(".numeric-keypad .btn-group").each(function () {
        nph += $(this).height();
    });
    $(".letter-keypad").css("height", nph);

    var hh = $(".header").height();
    var dh = $(window).height();
    $(".desktop.half-map-container").css("height", dh - hh);
    $(".content-panel-container").css("height", dh - hh - nph);

    var msh = $(".mobile-split-container").height();
    var hmph = $(".mobile.half-map-panel").height();
    $(".mobile.half-map-container").css("height", msh - hmph);
};

/*
requirejs.config({
    baseUrl: 'js/lib',
    paths: {
        "xhook": "../xhook.min",
        "crypto-js": "../../vendor/crypto-js-3.1.9-1/crypto-js",
        "proj4": "../../vendor/proj4js-2.5.0/dist/proj4"
    }
});
*/

import * as Cors from './gtw-cors';
import * as PluginLoader from './gtw-pluginloader';
import * as Transit from './gtw-citydata-transit';
import * as TransitEta from './gtw-citydata-transit-eta';
import * as Map from './gtw-map';
import * as loc from './gtw-location';
import * as ui from './gtw-ui';
import * as settings from './gtw-settings';
import * as RequestLimiter from './gtw-requestlimiter';
import * as log from './gtw-log';
import * as lang from './gtw-lang';
import * as Database from './gtw-db';
import * as gtfs from './gtw-citydata-transit-gtfs';
import proj4 from 'proj4';

window.p = TransitEta;

$(".build-version").html(VERSION);

proj4.defs("EPSG:2326", "+proj=tmerc +lat_0=22.31213333333334 +lon_0=114.1785555555556 +k=1 +x_0=836694.05 +y_0=819069.8 +ellps=intl +towgs84=-162.619,-276.959,-161.764,0.067753,-2.24365,-1.15883,-1.09425 +units=m +no_defs");
proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs");

settings.load();

lang.changeLanguage(settings.get("preferred_language", "en"));

RequestLimiter.start();

Cors.register("www.gotowhere.ga", true);
Cors.register("plugins.gotowhere.ga", true);

var GTFS_DATA_TYPES = [
    "agency",
    "calendar",
    "calendar_dates",
    "frequencies",
    "routes",
    "trips",
    "stops",
    "stop_time_paths",
    "stop_times",
    "fare_attributes",
    "fare_rules"
];

if (!window.indexedDB || !window.localStorage) {
    $("#startup-status").attr("style", "color: red");
    $("#startup-status").html($.i18n("startup-status-not-supported"));
} else {
    $("#startup-progress").css("width", "0%");
    $("#startup-status").html($.i18n("startup-status-loading-plugins"));
    PluginLoader.load(function (progress) {
            $("#startup-progress").css("width", progress / 5 + "%");
    }).then(function () {
        $("#startup-status").html($.i18n("startup-status-fetching-reference-db"));
        return TransitEta.fetchAllDatabase(function (progress) {
            $("#startup-progress").css("width", (progress / 5 + 20) + "%");
        });
    }).then(function () {
        $("#startup-status").html($.i18n("startup-status-obtaining-db-version"));
        return Transit.obtainDatabaseVersion(function (progress) {
            $("#startup-progress").css("width", (progress / 5  + 40) + "%");
        });
    }).then(function () {
        $("#startup-status").html($.i18n("startup-status-checking-db-update"));
        return Transit.checkDatabaseUpdate(function (progress) {
            $("#startup-progress").css("width", (progress / 5 + 60) + "%");
        });
    }).then(function () {
        $("#startup-status").html($.i18n("startup-status-validating-db"));
        return Transit.validateAllDatabase(function (progress) {
            $("#startup-progress").css("width", (progress / 5 + 80) + "%");
        });
    }).then(function () {
        if (Transit.hasDatabaseUpdate()) {
            Transit.initializeWorker();
            var takeSomeTimeText = "<b>" + $.i18n("startup-status-load-db-take-some-time") + "</b><br />";
            $("#startup-status").html(takeSomeTimeText + $.i18n("startup-status-downloading-db"));
            return Transit.downloadDatabase(function (progress) {
                console.log(progress);
                $("#startup-progress").css("width", progress / 8 + "%");
            }).then(function () {
                $("#startup-status").html(takeSomeTimeText + $.i18n("startup-status-preparing-update"));
                return Transit.prepareUpdate(function (progress) {
                    console.log(progress);
                    $("#startup-progress").css("width", progress / 8 + 12.5 + "%");
                });
            }).then(function loadAllGtfs(i) {
                if (typeof i !== "number") {
                    i = 0;
                }
                var dataType = GTFS_DATA_TYPES[i];
                $("#startup-status").html(takeSomeTimeText + $.i18n("startup-status-loading-" + dataType));
                return Transit.readChunks(dataType, function (progress) {
                    console.log(progress);
                    $("#startup-progress").css("width", (((progress / 2 / GTFS_DATA_TYPES.length) + (i * 100 / GTFS_DATA_TYPES.length)) / 100 * 75 + 25) + "%");
                }).then(function () {
                    $("#startup-status").html(takeSomeTimeText + $.i18n("startup-status-updating-" + dataType));
                    return Transit.waitToUpdate(function (progress) {
                        console.log(progress);
                        $("#startup-progress").css("width", (((progress / 2 + 50) / GTFS_DATA_TYPES.length + (i * 100 / GTFS_DATA_TYPES.length)) / 100 * 75 + 25) + "%");
                    });
                }).then(function () {
                    if (i != GTFS_DATA_TYPES.length - 1) {
                        return loadAllGtfs(i + 1);
                    } else {
                        Transit.terminateWorker();
                    }
                });
            })
        }
    }).then(function () {
        $("#startup-progress").css("width", "100%");
        $("#startup-status").html($.i18n("startup-status-init-map"));
        return Map.init();
    }).then(function () {
        $("#startup-status").html($.i18n("startup-status-finish"));
        $(".build-version").fadeOut(2000);

        var lastVer = localStorage.getItem("gtw-lastversion");
        if (lastVer && lastVer !== VERSION) {
            console.log("Application updated to " + VERSION + ". Showing change-log.");
            ui.showModal("updated", VERSION);
        }
        localStorage.setItem("gtw-lastversion", VERSION);

        ui.init();

        //TransitManager.start();
        //TransitManager.forceUpdate();

        var errPlugins = [];
        var plugin;
        for (var pluginKey in PluginLoader.plugins) {
            plugin = PluginLoader.plugins[pluginKey];
            if (plugin.status < 0) {
                errPlugins.push(plugin);
            }
        }
        console.log(errPlugins);

        if (errPlugins.length) {
            ui.showModal("errorplugins", errPlugins);
        }

        loc.requestLocationAccess(function () {
            //ui.init();
            //TransitManager.forceUpdate();
            $("#loc-status-btn").addClass("btn-success");
            $("#loc-status-btn").removeClass("btn-warning");
            setTimeout(function () {
                $("#loc-status-btn").fadeOut(500);
            }, 2000);
        }, function () {
            $("#loc-status-btn").addClass("btn-danger");
            $("#loc-status-btn").removeClass("btn-warning");
            $("#loc-status-btn").append(" <span> " + $.i18n("location-error") + "</span>");
            setTimeout(function () {
                $("#loc-status-btn span").fadeOut(500);
            }, 5000);
        });

        setTimeout(function () {
            $(".footer").animate({ height: 0, opacity: 0 }, 1000, function () {
                $(".footer").css("display", "none");
            });
        }, 2000);
        $(".startup").fadeOut(1000, function () {
            __stopHeaderAnimation = true;
        });

        //TODO: Check is raw
        if (false) {
            $("#bg-loaddb-status").html("Preparing to build database...");
            $(".bg-loaddb-panel").fadeIn();
            var worker = new Worker("./workers/bg-loaddb-worker.js", { type: 'module' });
            worker.addEventListener("message", function (evt) {
                var msg = evt.data;
                if (msg.type === 0) {
                    $("#bg-loaddb-status").html("Finish!");
                    $(".bg-loaddb-panel").fadeOut();
                } else if (msg.type === 1) {
                    $("#bg-loaddb-status").html("Building " + msg.stage + " database...");
                } else if (msg.type === 2) {
                    console.log(msg.progress);
                    $("#bg-loaddb-progress").css("width", msg.progress + "%");
                }
            });
            worker.postMessage("stop_times");
        }
    });
}