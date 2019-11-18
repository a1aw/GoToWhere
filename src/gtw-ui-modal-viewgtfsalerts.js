import * as Lang from './gtw-lang';

export function enable(alerts) {
    var html = "";
    var i;
    var alert;
    for (i = 0; i < alerts.length; i++) {
        alert = alerts[i];
        html +=
            "<div class=\"card\">" +
            "    <div class=\"card-header\" id=\"alert-" + i + "-heading\">" +
            "        <h2 class=\"mb-0\">" +
            "            <button class=\"btn btn-link\" type=\"button\" data-toggle=\"collapse\" data-target=\"#collapse-alert-" + i + "\" aria-expanded=\"true\" aria-controls=\"collapse-alert-" + i + "\">" + Lang.translatedString(alert.headerText) + "</button>" +
            "        </h2>" +
            "    </div>" +
            "    <div id=\"collapse-alert-" + i + "\" class=\"collapse" + (i === 0 ? " show" : "") + "\" aria-labelledby=\"alert-" + i + "-heading\" data-parent=\"#gtfsAlertsAccordion\">" +
            "        <div class=\"card-body\">" +
            Lang.translatedString(alert.descriptionText) +
            "        </div>" +
            "    </div>" +
            "</div>"
            ;
    }
    $("#gtfsAlertsAccordion").html(html);
}

export function disable() {

}