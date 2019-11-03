import * as UI from './gtw-ui';
import * as PluginLoader from './gtw-pluginloader';
import repos from './plugins/repository.json';

export function enable(pkg) {
    $(".modal .close").on("click", function () {
        UI.showModal("pluginmanager");
    });

    var packageJson = 0;
    for (var pkey in repos) {
        if (pkey === pkg) {
            packageJson = repos[pkey];
            break;
        }
    }

    if (!packageJson) {
        $(".modal-body").html($.i18n("view-plugin-repos-cannot-find-package"));
        return;
    }

    var html = "";

    if (packageJson.closedApi) {
        html += "<div class=\"alert alert-warning\" role=\"alert\"><i class=\"fas fa-exclamation-triangle\"></i> " + $.i18n("plugin-closed-api-warning") + "</div>";
    }

    html += "<h3>" + $.i18n("view-plugin-details") + "</h3>";
    html += "<hr />";
    html += "<p>" + $.i18n("view-plugin-details-name") + ": " + packageJson.name + "<br />";
    html += $.i18n("view-plugin-details-fullname") + ": " + packageJson.fullName + "<br />";
    html += $.i18n("view-plugin-details-author") + ": " + packageJson.author + "<br />";
    html += $.i18n("view-plugin-details-version") + ": " + packageJson.version + "<br />";
    html += $.i18n("view-plugin-details-github") + ": <a href=\"" + packageJson.github + "\" target=\"_blank\">" + packageJson.github + "</a><br />";
    html += $.i18n("view-plugin-details-package") + ": " + packageJson.package + "<br />";
    html += $.i18n("view-plugin-details-description") + ": " + packageJson.desc + "</p>";

    html += "<h3>" + $.i18n("view-plugin-installation") + "</h3>";
    html += "<hr />";

    var json = PluginLoader.getPlugin(packageJson.package);

    var statusMsg = "<span class=\"font-weight-bold ";
    if (!json) {
        statusMsg += "text-info\">" + $.i18n("view-plugin-installation-not-installed");
    } else if (json.status === -1) {
        statusMsg += "text-danger\">" + $.i18n("view-plugin-installation-plugin-not-available");
    } else if (json.status === 0) {
        statusMsg += "text-success\">" + $.i18n("view-plugin-installation-installed-running");
    } else if (json.status === 1) {
        statusMsg += "text-secondary\">" + $.i18n("view-plugin-installation-not-enabled");
    } else if (json.status <= -2 && json.status >= -4) {
        statusMsg += "text-danger\">" + $.i18n("view-plugin-installation-plugin-load-errors", json.status);
    } else {
        statusMsg += "text-secondary\">" + $.i18n("view-plugin-installation-unknown-status-code", json.status);
    }
    statusMsg += "</span>";

    html += "<p>" + $.i18n("view-plugin-installation-status") + ": " + statusMsg + "<br />";

    if (json && json.msg) {
        html += $.i18n("view-plugin-installation-message") + ": " + json.msg + "</p>";
    }

    html += "<hr />";

    if (json) {
        html += "<button type=\"button\" class=\"btn btn-danger ui-btn-viewplugin-uninstall\">" + $.i18n("view-plugin-installation-uninstall-and-restart-btn") + "</button>";
    } else {
        html += "<button type=\"button\" class=\"btn btn-success ui-btn-viewplugin-install\">" + $.i18n("view-plugin-installation-install-and-restart-btn") + "</button>";
    }

    $(".modal-body").html(html);

    $(".ui-btn-viewplugin-install").on("click", function () {
        PluginLoader.install(packageJson.package);
        window.location.reload();
    });

    $(".ui-btn-viewplugin-uninstall").on("click", function () {
        PluginLoader.uninstall(packageJson.package);
        window.location.reload();
    });
}

export function disable() {

}