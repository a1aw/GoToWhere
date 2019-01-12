// OpenETA script loader
const _scripts = [
	"js/openeta-app.js",
	"js/openeta-map.js",
	"js/openeta-event.js",
	"js/openeta-eta.js",
	"js/openeta-ui.js",
	"js/openeta-requestlimiter.js",
	"js/openeta-plugin.js",
	"js/openeta-pluginloader.js"
];

var PluginLoader;
var RequestLimiter;
var UIManager;
var EventManager;
var ETAManager;

var _loadScriptTasks;
var _installCode;

$(document).ready(function () {
	_loadScriptTasks = _scripts.length;
	for (var i = 0; i < _scripts.length; i++) {
		$("#startup-status").html("Loading OpenETA scripts... " + _scripts[i] + " (" + (i + 1) + "/" + _scripts.length + ")");

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
	if (_loadScriptTasks > 1) {
		_loadScriptTasks--;
		return;
	}

	ETAManager = new ETAManager();
	EventManager = new EventManager();
	UIManager = new UIManager();
	RequestLimiter = new RequestLimiter();
	RequestLimiter.start();

	$("#startup-status").html("Loading plugins...");
	PluginLoader = new PluginLoader();
	if (!PluginLoader.load()) {
		$("#startup-image").attr("style", "display: none");
		$("#startup-status").attr("style", "color: red");
		$("#startup-status").html("Load plugins failed<br>Check console log for more details.");
		return;
	}

	_installCode = getParameter("install");
	if (_installCode) {
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

	if (PluginLoader.getLoadedPlugins() == 0) {
		$("#startup-image").attr("style", "display: none");
		$("#startup-status").html("You need plugins to run OpenETA!");
		$("#startup-desc").html(
			"OpenETA is just an interface to display city data using a simple map.<br><br>" +
			"However, it does not contain code to get any kinds of data from the public. Plugins are here to add colours to the OpenETA interface.<br><br>" +
			"You can start by searching <b>openeta-plugin</b> in GitHub for plugins!"
		);
		return;
	}

	$("#startup-status").html("Initializing Database");
	$("#startup-desc").html(
		"<div class=\"progress progress- striped active\">" +
		"    <div class=\"progress-bar progress-bar-success\" id=\"startup-progress\" role=\"progressbar\" aria-valuenow=\"40\" aria-valuemin=\"0\" aria-valuemax=\"100\" style=\"width: 0%\">" +
		"    </div>" +
		"</div>"
	);

	$("#startup-progress").css("width", "100%");
	$("#startup-desc").html("");
	$("#startup-status").html("Preparing UI");

	UIManager.home();
	UIManager.show(true);

	$("#startup").html("");
	$("#startup").css("display", "none");
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