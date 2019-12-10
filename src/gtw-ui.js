//GTW UI

import * as Map from './gtw-map';
import * as PluginLoader from './gtw-pluginloader';
import * as Loc from './gtw-location';
import * as Event from './gtw-event';
import * as TouchKeypad from './gtw-ui-touchkeypad';

var currentTabModule = false;
var currentModalModule = false;

$(document).ready(function () {
    $(".header-links-plugins").on("click", function () {
        showModal("pluginmanager");
    });
    $(".header-links-settings").on("click", function () {
        showModal("settings");
    });
    $(".header-links-github").on("click", function () {
        window.open("https://github.com/mob41/GoToWhere");
    });
    $(".header-links-about").on("click", function () {
        showModal("about");
    });
    $(".header-links-feedback").on("click", function () {
        window.open("https://forms.gle/nP9cp1V2rqhdqybv5");
    });
});

$(".ui-tab").on("click", function () {
    if ($(this).hasClass("btn-primary")) {
        return;
    }
    $(".ui-tab").removeClass("btn-primary");
    $(".ui-tab").removeClass("btn-link");

    var tab = $(this).attr("data-gtw-tab");
    $(this).addClass("btn-primary");

    $(".ui-tab:not([data-gtw-tab='" + tab + "'])").addClass("btn-link");

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

$(".ui-split-map-back-btn").on("click", function () {
    Event.dispatchEvent(Event.EVENTS.EVENT_UI_BACK);
    Map.setCenter(Loc.getCurrentPosition());
    Map.setZoom(16);
    Map.removeAllMarkers();
    Map.removeAllPolylines();
    showPanel();
});

var splitContainerPercent = 80;

export function getSplitContainerPercent() {
    return splitContainerPercent;
}

$(".ui-pull-up-btn").on("click", function () {
    if (splitContainerPercent >= 80) {
        return;
    }
    splitContainerPercent += 20;
    $(".mobile-split-container").css("height", splitContainerPercent + "%");
    adjustMargin();
});

$(".ui-pull-down-btn").on("click", function () {
    if (splitContainerPercent <= 20) {
        return;
    }
    splitContainerPercent -= 20;
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
    $(".header nav").removeClass("gtw-split-map");

    $("body").removeClass("gtw-split-map");
    $("#gtw-map").removeClass("gtw-split-map");
    $(".map-overlay").removeClass("gtw-split-map");
    $(".split-map-panel").removeClass("gtw-split-map");
    $(".split-map-container").removeClass("gtw-split-map");
    $(".mobile-split-container").removeClass("gtw-split-map");

    //$(".header nav").addClass("bg-dark");
    //$(".split-map-panel").css("display", "none");
    //$(".top-panel").css("display", "block");
    //$(".split-map-container").css("display", "none");
    //$(".map-overlay").fadeIn(500);
    adjustMargin();
}

export function hidePanel() {
    $(".top-panel").css("display", "none");
    $(".content-panel-container").css("display", "none");
    $(".header nav").addClass("gtw-split-map");

    //$("body").addClass("gtw-split-map");
    $("#gtw-map").addClass("gtw-split-map");
    $(".map-overlay").addClass("gtw-split-map");
    $(".split-map-panel").addClass("gtw-split-map");
    $(".split-map-container").addClass("gtw-split-map");
    $(".mobile-split-container").addClass("gtw-split-map"); 

    //$(".split-map-panel").css("display", "block");
    //$(".split-map-container").css("display", "block");
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
        $(".tab-panel").html("");
        $(".content-panel-container").html("");
        $(".split-map-tab-panel").html("");
        $(".split-map-container").html("");
        TouchKeypad.hideTouchKeypad();
    }
}

export function showTab(tab, ...args) {
    cleanUpTab();
    import(`./gtw-ui-tab-${tab}`).then(function (module) {
        currentTabModule = module;
        module.enable.apply(this, args);
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