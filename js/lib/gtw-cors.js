//GTW CORS Handling

define(function (require, exports, module) {
    const CORS_PROTOCOL = "https://";
    
    var Cors = require("gtw-cors");
    var Settings = require("gtw-settings");

    exports.domains = {};

    exports.register = function (domain, allowCors = false) {
        var config = {};
        config.allowCors = allowCors;
        exports.domains[domain] = config;
    };

    xhook.before(function (request, callback) {
        if (Settings.get("cors_check_bypass", false)) {
            callback();
            return;
        }

        var cors = Cors.isCors(request.url);

        if (cors) {
            var host = Cors.extractHost(request.url);

            if (!host || host === "") {
                callback();
                return;
            }

            var config = Cors.domains[host];
            if (!config) {
                console.error("openeta-cors: The request to \"" + host + "\" was dropped, because this cross-domain host was not registered before performing AJAX.");
                callback({
                    status: 403,
                    statusText: 'The request is dropped by OpenETA because this host was not registered before performing AJAX.',
                    headers: {}
                });
                return;
            }

            if (Settings.get("use_cors_proxy", false)) {
                var proxy = Settings.get("cors_proxy_server", "https://cp1.gotowhere.ga/");
                if (proxy.startsWith("https://") && proxy.endsWith("/")) { 
                    var index = request.url.indexof("http://");
                    var sindex = request.url.indexof("https://");
                    if (index != -1 && sindex == -1) {
                        request.url = proxy + request.url.substring(index + 1);
                    } else if (index == -1 && sindex != -1) {
                        request.url = proxy + request.url.substring(sindex + 1);
                    } else {
                        console.error("openeta-cors: Invalid URL: " + request.url);
                    }
                } else {
                    console.error("openeta-cors: The provided CORS Proxy server is invalid! Please check if the server URL in the settings is correct!");
                    callback({
                        status: 403,
                        statusText: 'The provided CORS Proxy server is invalid! Please check if the server URL in the settings is correct!.',
                        headers: {}
                    });
                    return;
                }
            } else if (!config.allowCors) {
                console.error("openeta-cors: The request was dropped because there are no proxy available to handle CORS requests.");
                callback({
                    status: 403,
                    statusText: 'The request was dropped because there are no proxy available to handle CORS requests.',
                    headers: {}
                });
                return;
            }
        }

        callback();
    });

    exports.extractHost = function (url) {
        if (url.startsWith("file://")) {
            return "___file___";
        }
        var i = url.indexOf("://");
        var last = url.substring(i + 3);

        i = last.indexOf("/");
        if (i == -1) {
            i = last.length();
        }
        return last.substring(0, i);
    };

    exports.isCors = function (url) {
        if (!url.startsWith(CORS_PROTOCOL)) {
            return true;
        }

        var host = exports.extractHost(url);

        if (this.domains[host]) {
            var config = this.domains[host];
            if (config.allowCors) {
                return false;
            }
            return true;
        }

        return window.location.host != host;
    };
});