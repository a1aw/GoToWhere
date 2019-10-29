// GTW Language

import * as Settings from './gtw-settings';

export const locales = {
    "en": "English",
    "zh": "\u7e41\u9ad4\u4e2d\u6587"
};

export function localizedKey(localizedObject, key) {
    var lang = getLanguage();
    var locale = getLocale();

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
}

export function getLanguage() {
    return Settings.get("preferred_language", "en");
};

export function getLocale() {
    return Settings.get("preferred_language", "en").split("-")[0];
};

export function changeLanguage(locale) {
    var found = false;
    for (var x in locales) {
        if (locale === x) {
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
}