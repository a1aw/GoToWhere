export function enable(ver) {
    $("#updated-header").html($.i18n("updated-header", ver));
    $("#updated-desc").html($.i18n("updated-desc", ver));
    $("#updated-okay-btn").on("click", function () {
        hideModal();
    });
    import("./changelog.txt").then(function (mod) {
        $("#updated-changelog").html(mod.default);
    });
}

export function disable() {

}