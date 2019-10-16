// GTW Language

define(function (require, exports, module) {
    var Settings = require("gtw-settings");

    exports.locales = {
        "en": "English",
        "zh": "\u7e41\u9ad4\u4e2d\u6587",
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