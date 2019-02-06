//OpenETA Settings

const SETTINGS_STORAGE_KEY = "openeta-settings";

const VALUE_TYPES = {
	number: "number",
	string: "string",
	boolean: "boolean"
};

const DEFAULT_SETTINGS = [
	{
		key: "use_cors_proxy",
		type: "boolean",
		name: "Use CORS Proxy",
		desc: "For security reasons, browsers are not allowed to perform cross domain requests, aka CORS Policy. This will disallow plugins to fetch data from servers without required headers. This proxy is for adding Access-Control-Allow-Origin headers to server responses.",
		def: false
	},
	{
		key: "cors_proxy_server",
		type: "string",
		name: "CORS Proxy Server URL",
		desc: "It must be a secure URL starting with \"https://\" and ending with a slash \"/\".",
		def: "",
		checkfunc: function (val) {
			return val.startsWith("https://") && val.endsWith("/")
		}
	},
	{
		key: "cors_check_bypass",
		type: "boolean",
		name: "Bypass OpenETA-CORS Check",
		desc: "For development use only. This will bypass OpenETA's internal CORS check, disable CORS proxy. Requests will only work if the web browser's CORS policy is disabled.",
		def: false
	}
];

var Settings = function () {

	this.json = {};

	this.get = function (key, def = false) {
		var val = this.json[key];
		if (val === null) {
			return def;
		}
		return val;
	}

	this.set = function (key, val) {
		this.json[key] = val;
		return true;
	}

	this.load = function () {
		if (!localStorage) {
			return false;
		}
		var t = localStorage.getItem(SETTINGS_STORAGE_KEY);

		if (!t) {
			return this.save();
		}

		var j = JSON.parse(t);

		if (!j) {
			return false;
		}

		this.json = j;
		return true;
	}

	this.save = function () {
		if (!localStorage) {
			return false;
		}
		localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.json));
		return true;
	}

};