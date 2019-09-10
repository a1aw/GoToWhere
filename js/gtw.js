// OpenETA script loader

if (!window["_urlPrefix"]){
    window._urlPrefix = "";
}

const _googleMapScript = "https://maps.googleapis.com/maps/api/js?callback=initMap&key=";
const _scripts = [
	_urlPrefix + "js/gtw-app.js",
	_urlPrefix + "js/gtw-settings.js",
	_urlPrefix + "js/gtw-cors.js",
	_urlPrefix + "js/gtw-misc.js",
	_urlPrefix + "js/gtw-map.js",
	_urlPrefix + "js/gtw-event.js",
	_urlPrefix + "js/gtw-eta.js",
	_urlPrefix + "js/gtw-ui.js",
	_urlPrefix + "js/gtw-func.js",
	_urlPrefix + "js/gtw-location.js",
	_urlPrefix + "js/gtw-requestlimiter.js",
	_urlPrefix + "js/gtw-plugin.js",
	_urlPrefix + "js/gtw-pluginloader.js"
];

var Settings;
var PluginLoader;
var RequestLimiter;
var UIManager;
var EventManager;
var OpenETAMap;
var ETAManager;
var Misc;

var _loadScriptTasks;
var _installCode;

$(document).ready(function () {

    console.log(
        "   ____                   ______ _______       \n" +
        "  / __ \\                 |  ____|__   __|/\\    \n" +
        " | |  | |_ __   ___ _ __ | |__     | |  /  \\   \n" +
        " | |  | | '_ \\ / _ \\ '_ \\|  __|    | | / /\\ \\  \n" +
        " | |__| | |_) |  __/ | | | |____   | |/ ____ \\ \n" +
        "  \\____/| .__/ \\___|_| |_|______|  |_/_/    \\_\\\n" +
        "        | |                                    \n" +
        "        |_|                                    "
    );
    console.log("OpenETA (c) 2019. Licensed under the MIT License.");
    
	_scripts.push(_googleMapScript + _googleMapApiKey);
    _loadScriptTasks = _scripts.length;
    $("#startup-status").html("Loading OpenETA scripts... (" + _scripts.length + "/" + _scripts.length + " left)");
	for (var i = 0; i < _scripts.length; i++) {
		var node = document.createElement("script");
		node.src = _scripts[i];
		node.onload = function () {
			_postLoadScript();
		};
		node.async = false;
		document.head.appendChild(node);
	}
});

function _makeInstall() {
	$("#startup-desc").html("");
	$("#startup-status").html("Installing plugin...");
	$("#startup-image").attr("style", "");
	if (!PluginLoader.install(_installCode)) {
		$("#startup-image").attr("style", "display: none");
		$("#startup-status").attr("style", "color: red");
		$("#startup-status").html("Install plugin failed<br>Check console log for more details.");
		return;
	}

	$("#startup-image").attr("style", "display: none");
	$("#startup-status").attr("style", "color: green");
	$("#startup-status").html("Success!");
	$("#startup-desc").html(
		"The plugin has been installed successfully. Click below to start the application with the newly installed plugin.<br /><br />" +
		"<input type=\"button\" class=\"btn btn-default\" value=\"Start\" onclick=\"window.location='index.html'\" />"
	);
}

function _postLoadScript() {
    $("#startup-status").html("Loading OpenETA scripts... (" + _loadScriptTasks + "/" + _scripts.length + " left)");
	if (_loadScriptTasks > 1) {
		_loadScriptTasks--;
		return;
	}
	
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
    $("#startup-desc").html(
        "<div class=\"progress progress- striped active\">" +
        "    <div class=\"progress-bar progress-bar-success\" id=\"startup-progress\" role=\"progressbar\" aria-valuenow=\"40\" aria-valuemin=\"0\" aria-valuemax=\"100\" style=\"width: 0%\">" +
        "    </div>" +
        "</div>"
    );
    PluginLoader = new PluginLoader();
    var mt = PluginLoader.download();
	if (!mt) {
		$("#startup-image").attr("style", "display: none");
		$("#startup-status").attr("style", "color: red");
		$("#startup-status").html("Your browser does not support local storage.");
		return;
    }
    mt.progressChange(function (progress) {
        console.log(progress);
        $("#startup-progress").css("width", progress + "%");
    })
    mt.done(function () {
        $("#startup-progress").css("width", "100%");
        _postDownloadPlugin();
    });
}

function _postDownloadPlugin() {
    $("#startup-status").html("Loading plugins...");
    var pm = PluginLoader.load();
    $("#startup-desc").html("");
    pm.then(function () {
        _postLoadPlugin();
    });
}

function _postLoadPlugin() {
    _installCode = window.location.hash;
    var installKey = "#install:";
    if (_installCode && _installCode.startsWith(installKey)) {
        _installCode = decodeURIComponent(_installCode.substring(installKey.length));
        $("#startup-image").attr("style", "display: none");
        var json;
        try {
            json = PluginLoader.decode(_installCode);
        } catch (err) {
            $("#startup-status").attr("style", "color: red");
            $("#startup-status").html("Install Code Parsing Error");
            $("#startup-desc").html("The install code you provided is invalid. Please either copy and paste the code again, or try to use the online installation method.");
            return;
        }
        var calcSize = byteCount(_installCode);
        $("#startup-status").html("Are you sure to install this plugin?");
        $("#startup-desc").html(
            "<span style=\"color: red;\">Only install plugins from trusted sources. These plugins are able to access your location and do processing on your device.</span><br /><br />" +
            "<b>Name:</b> " + json.fullName + "<br />" +
            "<b>Package:</b> openeta-plugin-" + json.name + "<br />" +
            "<b>Author:</b> " + json.author + "<br /><br />" +
            "<b>Method:</b> " + (json.script ? "<span style=\"color: red; font-weight: bold\">Offline**</span>" : "Online") + "<br />" +
            "<b>Checksum:</b> " + json.checksum + "<br />" +
            "<b>Size:</b> " + autoSizeText(calcSize) + " <br /><br />" +
            "<b>GitHub Project:</b> " + json.githubProject + " <br /><br />" +
            "<input type=\"button\" class=\"btn btn-success\" value=\"Install Plugin\" onclick=\"_makeInstall()\" /> <input type=\"button\" class=\"btn btn-default\" value=\"Cancel\" onclick=\"window.location='index.html'\" />"
        );
        if (json.script) {
            $("#startup-desc").append(
                "<br /><br /><span style=\"color: red;\"><b>**Caution:</b> Make sure you trust the source of the install code for offline installation. The application is unable to verify offline sources automatically.</span>"
            );
        }
        return;
    }

	/*
	//Remove the weird behaviour in iOS web app
	var a = document.getElementsByTagName("a");
	for (var i = 0; i < a.length; i++) {
		a[i].onclick = function () {
			window.location = this.getAttribute("href");
			return false;
		}
	}
	*/

    $("#startup-status").html("Location Access");
    var convention = LocationManager.getConvention();
    if (convention == CONVENTION_ASK_EVERYTIME) {
        $("#startup-image").attr("style", "display: none");
        $("#startup-desc").html(
            "<div class=\"form-group\">" +
            "    <label>How should I handle location?</label>" +
            "    <select class=\"form-control\" id=\"startup-locationaccess-how\">" +
            "        <option value=\"0\">Ask for location access</option>" +
            "        <option value=\"1\">Directly request location access</option>" +
            "        <option value=\"2\">Only use custom location</option>" +
            "    </select>" +
            "    <div class=\"checkbox\">" +
            "        <label>" +
            "            <input type=\"checkbox\" id=\"startup-locationaccess-askeverytime\" />" +
            "            Ask everytime for this" +
            "        </label>" +
            "    </div>" +
            "</div>" +
            "<input type=\"button\" class=\"btn btn-success\" id=\"startup-locationaccess-how-btn\" value=\"OK\" />"
        );

        $("#startup-locationaccess-how-btn").click(function () {
            var val = $("#startup-locationaccess-how").val();
            var ask = $("#startup-locationaccess-askeverytime").is(":checked")
            var list = [
                CONVENTION_ASK_LOCATION_ACCESS,
                CONVENTION_DIRECT_LOCATION_ACCESS,
                CONVENTION_CUSTOM_LOCATION
            ];
            var selected = list[val];
            if (!ask) {
                LocationManager.setConvention(selected);
            }

            _initLoc(selected);
        });
    } else {
        _initLoc(convention);
    }
}

function _initLoc(convention) {
	if (convention == CONVENTION_ASK_LOCATION_ACCESS) {
		$("#startup-image").attr("style", "display: none");
		$("#startup-status").html("Location Access");
		$("#startup-desc").html(
			"<p>Click the button below to start requesting for location access.</p>" +
			"<input type=\"button\" class=\"btn btn-success\" id=\"startup-locationaccess-request-btn\" value=\"Request for location access\" />"
		);
		$("#startup-locationaccess-request-btn").click(function () {
			_requestLoc();
		});
	} else if (convention == CONVENTION_DIRECT_LOCATION_ACCESS) {
		_requestLoc();
	} else {
		alert("Custom location")
	}
}

function _requestLoc() {
	$("#startup-image").attr("style", "");
	$("#startup-desc").html(
		"<p>Waiting for location access...</p>"
	);
	LocationManager.requestLocationAccess(function () {
		_initDb();
	}, function () {
		$("#startup-image").attr("style", "display: none");
		$("#startup-status").attr("style", "color: red");
		$("#startup-status").html("Unable to get location access");
		$("#startup-desc").html(
			"<p>If you want to change how I should handle location, click the button below:</p>" +
			"<input type=\"button\" class=\"btn btn-warning\" id=\"startup-locationaccess-change-btn\" value=\"Change\" /> <input type=\"button\" class=\"btn btn-default\" onclick=\"window.location = 'index.html'\" value=\"Refresh\" />"
		);

		$("#startup-locationaccess-change-btn").click(function () {
			LocationManager.setConvention(CONVENTION_ASK_EVERYTIME);
			window.location = "index.html";
		});
	});
}

function _initDb() {
	$("#startup-status").html("Initializing Database");
	$("#startup-desc").html(
		"<div class=\"progress progress- striped active\">" +
		"    <div class=\"progress-bar progress-bar-success\" id=\"startup-progress\" role=\"progressbar\" aria-valuenow=\"40\" aria-valuemin=\"0\" aria-valuemax=\"100\" style=\"width: 0%\">" +
		"    </div>" +
		"</div>"
	);

	var startTime = new Date().getTime();
	var mt = ETAManager.requestAllDatabase();
	mt.progressChange(function (progress) {
		console.log(progress);
		$("#startup-progress").css("width", progress + "%");
	})
	mt.done(function () {
        $("#startup-progress").css("width", "100%");
        _initUi();
	});
}

function _initUi() {
    $("#startup-status").html("Loading UI Layouts");
    UIManager.loadUiLayouts(function () {
        UIManager.show("home");
        setTimeout(function () {
            ETAManager.forceUpdate();
        }, 1000);

        $("#startup").html("");
        $("#startup").css("display", "none");
    });
}

function autoSizeText(count) {
	var x = count / 1024.0;
	if (x < 1) {
		return count + " B";
	} else if (x / 1024.0 < 1) {
		return x.toFixed(2) + " KB";
	} else {
		return (x / 1024.0).toFixed(2) + " MB";
	}
}

function byteCount(s) {
	return encodeURI(s).split(/%..|./).length - 1;
}

function getParameter(parameterName) {
	var result = null,
		tmp = [];
	location.search
		.substr(1)
		.split("&")
		.forEach(function (item) {
			tmp = item.split("=");
			if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
		});
	return result;
}