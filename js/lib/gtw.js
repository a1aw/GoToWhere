// OpenETA script loader

if (!window["_urlPrefix"]){
    window._urlPrefix = "";
}

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

var __headerTexts = ["<i class=\"fas fa-map-marked-alt\"></i> GoToWhere<small>.ga</small>", "<i class=\"fas fa-map-marked-alt\"></i> \u53bb\u908a\u35ce", "<i class=\"fas fa-map-marked-alt\"></i> HeuiBin<small>.ga</small>"];
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
    $("#startup-status").html("Loading OpenETA scripts...");
});

$(window).resize(function () {
    adjustMargin();
});

function adjustMargin() {
    var hh = $(".header").height();
    var fh = $(".footer").height();
    $(".item-list").css("margin-top", hh);
    $(".item-list").css("margin-bottom", fh);
    $(".loading-overlay").css("height", $(".item-list").height());
    $(".loading-overlay").css("margin-top", hh);
}

requirejs.config({
    baseUrl: 'js/lib',
    paths: {
        "p-progress": "p-progress/index"
    }
});

requirejs(["gtw-cors", "gtw-pluginloader", "gtw-eta", "gtw-map", "gtw-location", "gtw-ui", "gtw-settings"], function (Cors, PluginLoader, ETAManager, Map, loc, ui, settings) {
    console.log("Load success");
    console.log(arguments);
    /*
    Settings = new Settings();
    Settings.load();
    Misc = new Misc();
    Func = new Func();
    OpenETAMap = new OpenETAMap();
    LocationManager = new LocationManager();
    ETAManager = new ETAManager();
    ETAManager.start();
    EventManager = new EventManager();
    UIManager = new UIManager();
    RequestLimiter = new RequestLimiter();
    RequestLimiter.start();
    */

    settings.load();

    Cors.register("www.openeta.ml", true);
    Cors.register("plugins.openeta.ml", true);

    $("#startup-status").html("Downloading plugins...");

    var promise = PluginLoader.download(function(progress){
        console.log(progress);
        $("#startup-progress").css("width", (progress / 8) + "%");
    });

	if (!promise) {
		$("#startup-status").attr("style", "color: red");
		$("#startup-status").html("Your browser does not support local storage.");
		return;
    }

    promise.then(function () {
        $("#startup-progress").css("width", "12.5%");
        $("#startup-status").html("Taking a rest!");

        $("#startup-progress").css("width", "25%");
        $("#startup-status").html("Loading plugins...");
        promise = PluginLoader.load();
        promise.then(function () {
            $("#startup-status").html("Initializing database...");
            promise = ETAManager.requestAllDatabase(function (progress) {
                console.log(progress);
                $("#startup-progress").css("width", (25 + progress / 4 * 3) + "%");
            });
            promise.then(function () {
                $("#startup-progress").css("width", "100%");
                $("#startup-status").html("Initializing map...");
                promise = Map.init();
                promise.then(function () {
                    $("#startup-status").html("Finish!");

                    ui.init();
                    ETAManager.start();
                    ETAManager.forceUpdate();

                    loc.requestLocationAccess(function () {
                        ui.init();
                        ETAManager.forceUpdate();
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
                    }, 5000);
                    $(".startup").fadeOut(1000, function () {
                        __stopHeaderAnimation = true;
                    });
                });
            });
        });
    });
});