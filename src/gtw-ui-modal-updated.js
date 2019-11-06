import * as UI from './gtw-ui';

export function enable(ver) {
    $("#updated-header").html($.i18n("updated-header", ver));
    $("#updated-desc").html($.i18n("updated-desc", ver));
    $("#updated-okay-btn").on("click", function () {
        UI.hideModal();
    });
    import("./changelog.txt").then(function (mod) {
        var html = "";
        var splits = mod.default.split("\n");
        var i;
        for (i = 0; i < splits.length; i++) {
            html += splits[i];
            if (i !== splits.length - 1) {
                html += "<br />";
            }
        }
        $("#updated-changelog").html(html);
    });
}

export function disable() {

}