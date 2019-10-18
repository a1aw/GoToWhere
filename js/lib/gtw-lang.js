// GTW Language

define(function (require, exports, module) {
    var Settings = require("gtw-settings");

    exports.locales = {
        "en": "English",
        "zh": "\u7e41\u9ad4\u4e2d\u6587",
    };

    exports.localizedKey = function (localizedObject, key) {
        var lang = exports.getLanguage();
        var locale = exports.getLocale();

        var langKey = key + "_" + lang;
        var localeKey = key + "_" + locale;
        var enKey = key + "_en";

        if (localizedObject[langKey]) {
            return localizedObject[langKey];
        }

        if (localizedObject[localeKey]) {
            return localizedObject[localeKey];
        }

        if (localizedObject[enKey]) {
            return localizedObject[enKey];
        }

        if (localizedObject[key]) {
            return localizedObject[key];
        }

        return false;
    };

    exports.getLanguage = function () {
        return Settings.get("preferred_language", "en");
    };

    exports.getLocale = function () {
        console.log(Settings.get("preferred_language", "en").split("-")[0]  );
        return Settings.get("preferred_language", "en").split("-")[0];
    };

    exports.changeLanguage = function (locale) {
        var found = false;
        for (var x in exports.locales) {
            if (locale == x) {
                found = true;
                break;
            }
        }
        if (!found) {
            return false;
        }

        Settings.set("preferred_language", locale);
        Settings.save();
        $.i18n().locale = locale;
        return $.i18n().load("i18n/" + locale + ".json", locale).done(function () {
            $("body").i18n();
        });
    };
});