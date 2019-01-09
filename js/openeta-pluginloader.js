// OpenETA Plugin Loader

var PluginLoader = function () {

	this.pluginsInfo = [];

	this.plugins = [];

	this.getLoadedPlugins = function () {
		return this.plugins.length;
	}

	this.decode = function (code) {
		var json = JSON.parse(Base64.decode(code));
		//TODO Compression / encryption stuff
		return json;
	}

	this.install = function (code) {
		if (!code) {
			return false;
		}

		var json;
		try {
			json = this.decode(code);
		} catch (err) {
			console.log("Install Error: " + err);
			return false;
		}

		if (!json.name || !json.script) {
			console.log("The installation code does not have a package name or a script!");
			return false;
		}

		var key = "openeta-plugin-" + json.name;
		localStorage.setItem(key, code);
		return true;
	}

	this.load = function () {
		var localStorage = window.localStorage;
		if (!localStorage) {
			return false;
		}

		var len = localStorage.length;

		var cmt = document.createComment("OpenETA Plugins (" + len + " plugin(s) installed)");
		document.head.appendChild(cmt);

		for (var i = 0; i < len; i++) {
			var key = localStorage.key(i);
			if (!key.startsWith("openeta-plugin-")) {
				continue;
			}
			try {
				var data = localStorage.getItem(key);
				cmt = document.createComment((i + 1) + ": " + key);
				document.head.appendChild(cmt);
				/*
				console.log(b64);
				var bytes = Base64.atob(b64);
				console.log(bytes);
				var gunzip = new Zlib.Gunzip(bytes);
				var plain = gunzip.decompress();
				console.log(plain)
				var asciistring = "";
				for (var i = 0; i < plain.length; i++) {
					asciistring += String.fromCharCode(plain[i]);
				}
				*/
				var json = JSON.parse(Base64.decode(data));
				console.log(json);
				if (!json.script || !json.className) {
					var t = "Error: \"" + key + "\" is missing a script or main class name.";
					console.log(t);
					cmt = document.createComment(t);
					document.head.appendChild(cmt);
					continue;
				}

				var node = document.createElement("script");
				node.innerHTML = json.script;
				document.head.appendChild(node);

				var plugin = new window[json.className]();

				if (!(plugin instanceof OpenETAPlugin)) {
					var t = "Error: Main class of \"" + key + "\" is not a child of OpenETAPlugin";
					console.log(t);
					cmt = document.createComment(t);
					document.head.appendChild(cmt);
					continue;
				}

				if (!plugin.onload()) {
					var t = "Error: \"" + key + "\" reported error for onload() function.";
					console.log(t);
					cmt = document.createComment(t);
					alert(t);
					document.head.appendChild(cmt);
					continue;
				}

				this.pluginsInfo.push(json);
				this.plugins.push(plugin);
			} catch (err) {
				console.log("Error loading " + key + ": " + err);
				return false;
			}
		}
		return true;
	}
}