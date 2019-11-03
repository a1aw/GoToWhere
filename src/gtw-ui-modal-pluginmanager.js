import * as UI from './gtw-ui';
import repos from './plugins/repository.json';
import cates from './plugins/categories.json';

export function enable() {
    var html = "<p>" + $.i18n("plugin-manager-loading") + "</p>";

    $("#nav-all").html(html);
    $("#nav-installed").html(html);
    $("#nav-transit").html(html);
    $("#nav-libraries").html(html);
    $("#nav-others").html(html);

    var byCategory = {};
    for (var pluginKey in repos) {
        if (!byCategory[repos[pluginKey].category]) {
            byCategory[repos[pluginKey].category] = [];
        }
        byCategory[repos[pluginKey].category].push(repos[pluginKey]);
    }

    var allHtml = "<div class=\"list-group\">";
    var tabNode = $("#nav-tab");
    var tabContentNode = $("#nav-tabContent");
    var pluginHtml;
    var categoryTabHtml;
    var categoryTabContentHtml;
    var category;
    var total = 0;
    for (var categoryKey in byCategory) {
        category = cates[categoryKey];

        total += byCategory[categoryKey].length;
        categoryTabHtml = "<a class=\"nav-item nav-link\" id=\"nav-" + category.id + "-tab\" data-toggle=\"tab\" href=\"#nav-" + category.id + "\" role=\"tab\" aria-controls=\"nav-" + category.id + "\" aria-selected=\"true\">" + category.name + " (" + byCategory[categoryKey].length + ")</a>";
        categoryTabContentHtml = "<div class=\"tab-pane fade\" id=\"nav-" + category.id + "\" role=\"tabpanel\" aria-labelledby=\"nav-" + category.id + "-tab\"><div class=\"list-group\">";

        for (var pluginJson of byCategory[categoryKey]) {
            pluginHtml = "<a href=\"#\" class=\"list-group-item list-group-item-action ui-pluginmanager-view-plugin\" package=\"" + pluginJson.package + "\">";
            pluginHtml += "    <div class=\"d-flex w-100 justify-content-between\">";
            pluginHtml += "        <h5 class=\"mb-1\">" + pluginJson.fullName + "</h5>";
            pluginHtml += "        <small>" + pluginJson.version + "</small>";
            pluginHtml += "    </div>";
            pluginHtml += "    <p class=\"mb-1\">" + pluginJson.desc + "</p>";
            pluginHtml += "    <small>By " + pluginJson.author + "</small>";
            pluginHtml += "</a>";
            categoryTabContentHtml += pluginHtml;
            allHtml += pluginHtml;
        }
        categoryTabContentHtml += "</div></div>";
        tabNode.append(categoryTabHtml);
        tabContentNode.append(categoryTabContentHtml);
    }

    $("#nav-all-tab").html($.i18n("plugin-manager-tab-all") + " (" + total + ")");
    $("#nav-all").html(allHtml);

    $(".ui-pluginmanager-view-plugin").on("click", function () {
        UI.showModal("viewplugin", $(this).attr("package"));
    });
}

export function disable() {

}