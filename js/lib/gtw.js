// OpenETA script loader

if (!window["_urlPrefix"]){
    window._urlPrefix = "";
}

//const _googleMapScript = "https://maps.googleapis.com/maps/api/js?callback=initMap&key=";
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

var headerTexts = ["GoToWhere<small>.ga</small>", "\u53bb\u908a\u35ce", "HeuiBin<small>.ga</small>"];

function headerAnimation(i) {
    if (i === undefined || i > 2) {
        i = 0;
    }
    $(".startup h1").html(headerTexts[i]);
    $(".startup h1").fadeIn(2000, function () {
        $(".startup h1").fadeOut(2000, function () {
            headerAnimation(i + 1);
        });
    });
}

$(document).ready(function () {
    $(".startup .progress-panel").fadeIn(5000);
    $(".startup .container").fadeIn(2000, function () {
        headerAnimation();
    });
    console.log("GoToWhere (c) 2019. Licensed under the MIT License.");
    $("#startup-status").html("Loading OpenETA scripts...");
});

requirejs.config({
    baseUrl: 'js/lib',
    paths: {
        "p-progress": "p-progress/index"
    }
});

requirejs(_allModules, function () {
    console.log("Load success");
    console.log(arguments);
    Settings = new Settings();
    Settings.load();
    Cors = new Cors();
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

    Cors.register("www.openeta.ml", true);
    Cors.register("plugins.openeta.ml", true);

    $("#startup-status").html("Downloading plugins...");
    PluginLoader = new PluginLoader();

    var promise = PluginLoader.download(function(progress){
        console.log(progress);
        $("#startup-progress").css("width", progress * 100 + "%");
    });

	if (!promise) {
		$("#startup-status").attr("style", "color: red");
		$("#startup-status").html("Your browser does not support local storage.");
		return;
    }
    
    promise.then(function () {
        $("#startup-progress").css("width", "100%");
        $("#startup-status").html("Loading plugins...");
        promise = PluginLoader.load();
        promise.then(function () {
            $("#startup-status").html("Initializing database...");
            promise = ETAManager.requestAllDatabase(function (progress) {
                console.log(progress);
                $("#startup-progress").css("width", progress * 100 + "%");
            });
            promise.then(function () {
                $("#startup-progress").css("width", "100%");
                console.log("Done");
                _initUi();
            });
        });
    });
});