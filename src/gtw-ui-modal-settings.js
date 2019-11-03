import * as Settings from './gtw-settings';
import * as UI from './gtw-ui';

export function enable() {
    var html = "";

    var val;
    for (var setting of Settings.getDefaultSettings()) {
        val = Settings.get(setting.key, setting.def);
        html +=
            "<div class=\"form-group\">" +
            "    <label><b>" + setting.name + ":</b><p>" + setting.desc + "</p></label>";
        if (setting.type === "boolean") {
            html += "    <select class=\"form-control\" id=\"gtw-settings-" + setting.key + "\">";
            if (val) {
                html +=
                    "        <option value=\"yes\" selected>" + $.i18n("settings-option-yes") + "</option>" +
                    "        <option value=\"no\">" + $.i18n("settings-option-no") + "</option>";
            } else {
                html +=
                    "        <option value=\"yes\">" + $.i18n("settings-option-yes") + "</option>" +
                    "        <option value=\"no\" selected>" + $.i18n("settings-option-no") + "</option>";
            }
            html += "    </select>";
        } else {
            html += "    <input class=\"form-control\" id=\"gtw-settings-" + setting.key + "\" type=\"";
            if (setting.type === "number") {
                html += "number";
            } else {
                html += "text";
            }
            html += "\" value=\"" + val + "\"/>";
        }
        html += "</div>";

    }

    html +=
        "<input type=\"button\" class=\"btn btn-success ui-btn-settings-save ui-btn-settings-save-close\" value=\"" + $.i18n("settings-save-and-close-btn") + "\"/> " +
        "<input type=\"button\" class=\"btn btn-default ui-btn-settings-save\" value=\"" + $.i18n("settings-apply-btn") + "\"/>";

    $(".modal-body").html(html);

    $(".ui-btn-settings-save").on("click", function () {
        var val;
        var out;
        for (var setting of Settings.getDefaultSettings()) {
            val = $("#gtw-settings-" + setting.key).val();
            if (setting.type === "boolean") {
                out = val === "yes";
            } else if (setting.type === "number") {
                out = parseInt(val);
            } else {
                out = val;
            }
            if (setting.checkfunc && !setting.checkfunc(out)) {
                alert($.i18n("settings-invalid-value", setting.name));
                return;
            }
            Settings.set(setting.key, out);
        }
        Settings.save();

        if ($(this).hasClass("ui-btn-settings-save-close")) {
            UI.hideModal();
        }
    });
}

export function disable() {

}