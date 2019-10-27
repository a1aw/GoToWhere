// GoToWhere startup script

//Strict mode
'use strict';

/*
const _allModules = [
	"gtw-app",
	"gtw-settings",
	"gtw-cors",
	"gtw-misc",
	"gtw-map",
	"gtw-event",
	"gtw-eta",
	"gtw-ui",
	"gtw-func",
	"gtw-location",
	"gtw-requestlimiter",
	"gtw-plugin",
	"gtw-pluginloader"
];
*/

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

function adjustMargin() {
    var hh = $(".header").height();
    //var fh = $(".footer").height();
    var dh = $(window).height();

    //$(".desktop.half-map-container").css("margin-top", hh);
    //$(".half-map-container").css("margin-bottom", fh);
    $(".desktop.half-map-container").css("height", dh - hh);

    //$(".content-panel-container").css("margin-top", hh);
    //$(".item-list").css("margin-bottom", fh);
    $(".content-panel-container").css("height", dh - hh);
    //$(".loading-overlay").css("height", $(".item-list").height());
    //$(".loading-overlay").css("margin-top", hh);
}

requirejs.config({
    baseUrl: 'js/lib',
    paths: {
        "xhook": "../xhook.min",
        "crypto-js": "../../vendor/crypto-js-3.1.9-1/crypto-js",
        "proj4": "../../vendor/proj4js-2.5.0/dist/proj4"
    }
});

requirejs(["gtw-cors", "gtw-pluginloader", "gtw-citydata-transit", "gtw-citydata-transit-eta", "gtw-map", "gtw-location", "gtw-ui", "gtw-settings", "gtw-requestlimiter", "gtw-log", "gtw-lang", "gtw-db", "proj4", "crypto-js"], function (Cors, PluginLoader, Transit, TransitEta, Map, loc, ui, settings, RequestLimiter, log, lang, Database, proj4) {
    /*
    Settings = new Settings();
    Settings.load();
    Misc = new Misc();
    Func = new Func();
    OpenETAMap = new OpenETAMap();
    LocationManager = new LocationManager();
    TransitManager = new TransitManager();
    TransitManager.start();
    EventManager = new EventManager();
    UIManager = new UIManager();
    RequestLimiter = new RequestLimiter();
    RequestLimiter.start();
    */
    proj4.defs("EPSG:2326", "+proj=tmerc +lat_0=22.31213333333334 +lon_0=114.1785555555556 +k=1 +x_0=836694.05 +y_0=819069.8 +ellps=intl +towgs84=-162.619,-276.959,-161.764,0.067753,-2.24365,-1.15883,-1.09425 +units=m +no_defs");
    proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs");

    settings.load();

    lang.changeLanguage(settings.get("preferred_language", "en"));

    RequestLimiter.start();

    Cors.register("www.gotowhere.ga", true);
    Cors.register("plugins.gotowhere.ga", true);

    $("#startup-status").html($.i18n("startup-status-downloading-plugins"));

    var promise = PluginLoader.download(function(progress){
        $("#startup-progress").css("width", (progress / 8) + "%");
    });

	if (!promise) {
		$("#startup-status").attr("style", "color: red");
		$("#startup-status").html($.i18n("startup-status-not-supported"));
		return;
    }

    promise.then(function () {
        $("#startup-progress").css("width", "12.5%");
        //$("#startup-status").html($.i18n("startup-status-taking-a-rest"));

        $("#startup-status").html($.i18n("startup-status-open-db"));
        promise = Database.open();
        promise.then(function () {
            $("#startup-progress").css("width", "25%");
            $("#startup-status").html($.i18n("startup-status-loading-plugins"));
            promise = PluginLoader.load(function (progress) {
                $("#startup-progress").css("width", 25 + (progress / 8) + "%");
            });
            promise.then(function () {
                $("#startup-status").html($.i18n("startup-status-init-db"));
                promise = Transit.fetchAllDatabase(function (progress) {
                    $("#startup-progress").css("width", (25 + progress / 4 * 3) + "%");
                });
                promise.then(function () {
                    $("#startup-progress").css("width", "100%");
                    $("#startup-status").html($.i18n("startup-status-init-map"));
                    promise = Map.init();
                    promise.then(function () {
                        $("#startup-status").html($.i18n("startup-status-finish"));

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
                            ui.init();
                            //TransitManager.forceUpdate();
                            $("#loc-status-btn").addClass("btn-success");
                            $("#loc-status-btn").removeClass("btn-warning");
                            setTimeout(function () {
                                $("#loc-status-btn").fadeOut(500);
                            }, 2000);
                        }, function () {
                            $("#loc-status-btn").addClass("btn-danger");
                            $("#loc-status-btn").removeClass("btn-warning");
                            $("#loc-status-btn").append(" <span>Failed!</span>");
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
                    });
                });
            });
        });
    });
});