//GTW Settings

const SETTINGS_STORAGE_KEY = "gtw-settings";

const VALUE_TYPES = {
    number: "number",
    string: "string",
    boolean: "boolean"
};

export function getDefaultSettings() {
    return [
        {
            key: "preferred_language",
            type: "string",
            name: $.i18n("settings-key-preferred-language"),
            desc: $.i18n("settings-key-preferred-language-desc"),
            def: "en",
            checkfunc: function (val) {
                var locales = require("./gtw-lang").locales;
                var found = false;
                for (var locale in locales) {
                    if (locale === val) {
                        found = true;
                        break;
                    }
                }
                return found;
            }
        },
        {
            key: "min_nearby_transit_range",
            type: "number",
            name: $.i18n("settings-key-min-nearby-transit-search-range"),
            desc: $.i18n("settings-key-min-nearby-transit-search-range-desc"),
            def: 200,
            checkfunc: function (val) {
                var x = parseInt(val);
                return !Number.isNaN(x) && x < 10000;
            }
        },
        {
            key: "max_nearby_transit_to_display",
            type: "number",
            name: $.i18n("settings-key-max-nearby-transit-to-be-displayed"),
            desc: $.i18n("settings-key-max-nearby-transit-to-be-displayed-desc"),
            def: 20,
            checkfunc: function (val) {
                var x = parseInt(val);
                return !Number.isNaN(x) && x < 100;
            }
        },
        {
            key: "use_cors_proxy",
            type: "boolean",
            name: $.i18n("settings-key-use-cors-proxy"),
            desc: $.i18n("settings-key-use-cors-proxy-desc"),
            def: true
        },
        {
            key: "cors_proxy_server",
            type: "string",
            name: $.i18n("settings-key-cors-proxy-server"),
            desc: $.i18n("settings-key-cors-proxy-server-desc"),
            def: "https://cp1.gotowhere.ga/",
            checkfunc: function (val) {
                return val.startsWith("https://") && val.endsWith("/")
            }
        },
        {
            key: "cors_check_bypass",
            type: "boolean",
            name: $.i18n("settings-key-cors-check-bypass"),
            desc: $.i18n("settings-key-cors-check-bypass-desc"),
            def: false
        }
    ];
}

export var json = {};

export function get(key, def = false) {
    var val = json[key];
    if (typeof val === 'undefined') {
        return def;
    }
    return val;
}

export function set(key, val) {
    json[key] = val;
    return true;
}

export function load() {
    if (!localStorage) {
        return false;
    }
    var t = localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!t) {
        return save();
    }

    var j = JSON.parse(t);

    if (!j) {
        return false;
    }

    json = j;
    return true;
}

export function save() {
    if (!localStorage) {
        return false;
    }
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(json));
    return true;
}