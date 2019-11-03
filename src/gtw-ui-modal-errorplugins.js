export function enable(errorPlugins) {
    var node = $("#errorPluginsAccordion");
    var html = "";
    var errSummary;
    for (var plugin of errorPlugins) {
        if (plugin.status === -1) {
            errSummary = $.i18n("error-plugins-summary-plugin-not-available") + " (" + plugin.status + ")";
        } else if (plugin.status >= -2 && plugin.status <= -4) {
            errSummary = $.i18n("error-plugins-summary-plugin-load") + " (" + plugin.status + ")";
        } else {
            errSummary = $.i18n("error-plugins-summary-unknown-status-code") + " (" + plugin.status + ")";
        }
        html +=
            "<div class=\"card\">" +
            "    <div class=\"card-header\" id=\"err-" + plugin.package + "-heading\">" +
            "        <h2 class=\"mb-0\">" +
            "            <button class=\"btn btn-link\" type=\"button\" data-toggle=\"collapse\" data-target=\"#collapse-err-" + plugin.package + "\" aria-expanded=\"true\" aria-controls=\"collapse-err-" + plugin.package + "\">" + plugin.package + ": " + errSummary + "</button>" +
            "        </h2>" +
            "    </div>" +
            "    <div id=\"collapse-err-" + plugin.package + "\" class=\"collapse\" aria-labelledby=\"err-" + plugin.package + "-heading\" data-parent=\"#errorPluginsAccordion\">" +
            "        <div class=\"card-body\">"
            ;

        html += "<p><b>" + $.i18n("error-plugins-message") + "</b><br/>" + plugin.msg + "</p>";
        html += "<p><b>" + $.i18n("error-plugins-solutions") + "</b><br/>";

        if (plugin.status === -1) {
            html += $.i18n("error-plugins-solution-plugin-not-available");
        } else if (plugin.status >= -4 && plugin.status <= -2) {
            html += $.i18n("error-plugins-solution-plugin-load", plugin.status);
        } else {
            html += $.i18n("error-plugins-solution-unknown-status-code", plugin.status);
        }
        html += "</p>";

        html +=
            "        </div>" +
            "    </div>" +
            "</div>"
            ;
    }
    node.html(html);
}

export function disable() {

}