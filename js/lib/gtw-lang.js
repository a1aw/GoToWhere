// GTW Language

define(function (require, exports, module) {

    exports.locales = [
        "en"
    ];

    exports.changeLanguage = function (locale) {
        return $.i18n().load("i18n/" + locale + ".json", locale).done(function () {
            $("body").i18n();
        });
    };
});