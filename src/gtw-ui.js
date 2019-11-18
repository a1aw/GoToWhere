//GTW UI

import * as Map from './gtw-map';
import * as PluginLoader from './gtw-pluginloader';
import * as Loc from './gtw-location';
import * as Event from './gtw-event';

var currentTabModule = false;
var currentModalModule = false;

$(document).ready(function () {
    $(".header-links-plugins").on("click", function () {
        showModal("pluginmanager");
    });
    $(".header-links-settings").on("click", function () {
        showModal("settings");
    });
    $(".header-links-about").on("click", function () {
        showModal("about");
    });
    $(".feedback-btn").on("click", function () {
        window.open("https://forms.gle/nP9cp1V2rqhdqybv5");
    });
});

$(".ui-tab").on("click", function () {
    if ($(this).hasClass("btn-primary")) {
        return;
    }
    $(".ui-tab").removeClass("btn-primary");
    $(".ui-tab").removeClass("btn-link");

    var tab = $(this).attr("gtw-tab");
    $(this).addClass("btn-primary");

    $(".ui-tab:not([gtw-tab='" + tab + "'])").addClass("btn-link");

    showTab(tab);
});

$(".btn").on("click", function () {
    $(this).blur();
});

/*
$(".btn").on("mouseup", function () {
    $(this).blur();
});
*/

$(".ui-half-map-back-btn").on("click", function () {
    Event.dispatchEvent(Event.EVENTS.EVENT_UI_BACK);
    Map.setCenter(Loc.getCurrentPosition());
    Map.setZoom(16);
    Map.removeAllMarkers();
    Map.removeAllPolylines();
    showPanel();
});

var splitContainerPercent = 50;

$(".ui-pull-up-btn").on("click", function () {
    if (splitContainerPercent >= 90) {
        return;
    }
    splitContainerPercent += 10;
    $(".mobile-split-container").css("height", splitContainerPercent + "%");
    adjustMargin();
});

$(".ui-pull-down-btn").on("click", function () {
    if (splitContainerPercent <= 10) {
        return;
    }
    splitContainerPercent -= 10;
    $(".mobile-split-container").css("height", splitContainerPercent + "%");
    adjustMargin();
});

export function init() {
    if (Object.keys(PluginLoader.plugins).length === 0) {
        gettingStarted();
    }

    showTab("transit");
    adjustMargin();
    showPanel();
}

export function showPanel() {
    $(".content-panel-container").css("display", "inline-block");
    $(".top-panel").css("display", "block");
    $(".header nav").removeClass("gtw-half-map");

    $("body").removeClass("gtw-half-map");
    $("#gtw-map").removeClass("gtw-half-map");
    $(".map-overlay").removeClass("gtw-half-map");
    $(".half-map-panel").removeClass("gtw-half-map");
    $(".half-map-container").removeClass("gtw-half-map");
    $(".mobile-split-container").removeClass("gtw-half-map");

    //$(".header nav").addClass("bg-dark");
    //$(".half-map-panel").css("display", "none");
    //$(".top-panel").css("display", "block");
    //$(".half-map-container").css("display", "none");
    //$(".map-overlay").fadeIn(500);
    adjustMargin();
}

export function hidePanel() {
    $(".top-panel").css("display", "none");
    $(".content-panel-container").css("display", "none");
    $(".header nav").addClass("gtw-half-map");

    //$("body").addClass("gtw-half-map");
    $("#gtw-map").addClass("gtw-half-map");
    $(".map-overlay").addClass("gtw-half-map");
    $(".half-map-panel").addClass("gtw-half-map");
    $(".half-map-container").addClass("gtw-half-map");
    $(".mobile-split-container").addClass("gtw-half-map");

    //$(".half-map-panel").css("display", "block");
    //$(".half-map-container").css("display", "block");
    //$(".header nav").removeClass("bg-dark");
    //$(".map-overlay").fadeOut(500);
    adjustMargin();
}

/*
export function clearUp() {
    Map.setCenter(Loc.getCurrentPosition());
    Map.setZoom(16);
    Map.removeAllMarkers();
    Map.removeAllPolylines();

    vars = {};
    for (var key in timers) {
        clearInterval(timers[key]);
    }
    timers = [];
    $(".tab-panel").html("");
    $(".content-panel-container").html("");
}

export function modalClearUp() {
    modalVars = {};
    for (var timer of modalTimers) {
        clearInterval(timer);
    }
}
*/

export function showModal(layout, ...args) {
    //nowUi = layout;
    //previousUi = 0;
    cleanUpModal();
    loadModalLayout(layout, true).then(function () {
        $(".modal").i18n();
        import(`./gtw-ui-modal-${layout}`).then(function (module) {
            currentModalModule = module;
            module.enable.apply(this, args);
        });
    });
}

export function loadModalLayout(layout, options = {}) {
    const key = "modal-" + layout;

    if (options === true) {
        options = {};
        options.backdrop = "static";
        options.keyboard = false;
    }
    
    var proms = [];
    proms.push(import(`./ui/${key}-header.html`).then(function (mod) {
        $(".modal-header").html(mod.default);
    }));
    proms.push(import(`./ui/${key}-body.html`).then(function (mod) {
        $(".modal-body").html(mod.default);
    }));
    proms.push(import(`./ui/${key}-footer.html`).then(function (mod) {
        $(".modal-footer").html(mod.default);
    }));

    var p = Promise.all(proms);
    p.then(function () {
        $(".modal").modal(options);
    });
    return p;
}

export function hideModal() {
    $(".modal").modal("hide");
    cleanUpModal();
}

export function isModalShown() {
    return ($(".modal").data('bs.modal') || {})._isShown;
}

export function cleanUpModal() {
    if (currentModalModule) {
        currentModalModule.disable();
        currentModalModule = false;
    }
}

export function cleanUpTab() {
    if (currentTabModule) {
        currentTabModule.disable();
        currentTabModule = false;
    }
}

export function showTab(tab) {
    cleanUpTab();
    import(`./gtw-ui-tab-${tab}`).then(function (module) {
        currentTabModule = module;
        module.enable();
    });
}

export function gettingStarted() {
    cleanUpTab();
    cleanUpModal();
    import("./gtw-ui-gettingstarted").then(function (module) {
        module.enable();
    });
}

//
// Available scripts
//
// Modal: updated, pluginclosedapi, errorplugins, viewplugin, pluginmanager, settings
// Tab: transit
//