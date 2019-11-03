export function gettingStarted() {
    $(".header nav").css("display", "none");
    $("#gettingStartedWizard").smartWizard({
        useURLhash: false,
        showStepURLhash: false
    });
    $(".top-panel").css("display", "none");
    $(".content-panel-container").css("display", "none");
    $(".getting-started-panel").css("display", "block");

    var html = "";
    for (var lang in Lang.languages) {
        html += "<option value=\"" + lang + "\">" + Lang.languages[lang] + " (" + lang + ")</option>";
    }
    $("#langSelect").html(html);
    $("#langSelect").on("change", function () {
        Lang.changeLanguage($(this).val());
    });

    var byRegion = {};
    for (var key in repos) {
        if (!byRegion[repos[key].region]) {
            byRegion[repos[key].region] = [];
        }
        byRegion[repos[key].region].push(repos[key]);
    }

    $("#regionSelect").html("");
    var regionOptionsHtml = "<option value=\"notselected\">-- " + $.i18n("getting-started-wizard-step-plugins-select") + " --</option>";
    for (var region in byRegion) {
        regionOptionsHtml += "<option value=\"" + region + "\"> " + region + "</option>";
    }
    $("#regionSelect").removeAttr("disabled");
    $("#regionSelect").html(regionOptionsHtml);

    var byCategory = {};
    for (var pluginKey in repos) {
        if (!byCategory[repos[pluginKey].category]) {
            byCategory[repos[pluginKey].category] = [];
        }
        byCategory[repos[pluginKey].category].push(repos[pluginKey]);
    }

    var calcInstallCount = function () {
        var totalCount = 0;
        var categoryCount;
        var node;
        var allCount = 0;
        var category;

        for (var categoryKey in byCategory) {
            category = cates[categoryKey];

            categoryCount = 0;
            $(".plugin-switch[category-id='" + category.id + "']").each(function () {
                if ($(this).prop("checked")) {
                    categoryCount++;
                }
            });
            node = $(".category-btn[category-id='" + category.id + "']");
            node.html(node.attr("category-name") + " (" + categoryCount + "/" + byCategory[categoryKey].length + ")");
            totalCount += categoryCount;
            allCount += byCategory[categoryKey].length;
        }

        $("#pluginsToInstallCount").html($.i18n("getting-started-wizard-step-plugins-install-count", totalCount, allCount));
        $("#installCount").html($.i18n("getting-started-wizard-step-finish-press-button", totalCount));
        $(".need-to-install").css("display", totalCount > 0 ? "none" : "block");
        if (totalCount > 0) {
            $("#getStartedBtn").removeClass("disabled");
        } else {
            $("#getStartedBtn").addClass("disabled");
        }
    };

    $("#regionSelect").on("change", function () {
        var val = $(this).val();
        var node = $("#pluginsToInstallAccordion");
        var installCountNode = $("#pluginsToInstallCount");
        if (val === "notselected") {
            node.html("");
            installCountNode.html("");
            calcInstallCount();
            return;
        }

        var html = "";
        var pluginHtml;
        var category;
        for (var categoryKey in byCategory) {
            category = cates[categoryKey];

            installCount = 0;
            pluginHtml = "";
            for (var plugin of byCategory[categoryKey]) {
                pluginHtml +=
                    "            <div class=\"custom-control custom-switch\">" +
                    "                <input type=\"checkbox\" class=\"custom-control-input plugin-switch" + (plugin.closedApi ? " plugin-closed-api" : "") + "\" category-id=\"" + category.id + "\" package=\"" + plugin.package + "\" id=\"switch-" + plugin.package + "\"" + (plugin.closedApi ? "" : "checked") + ">" +
                    "                <label class=\"custom-control-label\" for=\"switch-" + plugin.package + "\">" + plugin.fullName;
                if (plugin.closedApi) {
                    pluginHtml +=
                        "<br /><i class=\"fas fa-exclamation-triangle\"></i> " + $.i18n("getting-started-wizard-step-plugins-closed-api");
                }
                pluginHtml +=
                    "</label>" +
                    "            </div>"
                    ;
            }

            html +=
                "<div class=\"card\">" +
                "    <div class=\"card-header\" id=\"category-" + category.id + "-heading\">" +
                "        <h2 class=\"mb-0\">" +
                "            <button class=\"btn btn-link category-btn\" type=\"button\" data-toggle=\"collapse\" data-target=\"#collapse-category-" + category.id + "\" aria-expanded=\"true\" aria-controls=\"collapse-category-" + category.id + "\" category-id=\"" + category.id + "\" category-name=\"" + category.name + "\">" + category.name + "</button>" +
                "        </h2>" +
                "    </div>" +
                "    <div id=\"collapse-category-" + category.id + "\" class=\"collapse\" aria-labelledby=\"category-" + category.id + "-heading\" data-parent=\"#pluginsToInstallAccordion\">" +
                "        <div class=\"card-body\">" + pluginHtml +
                "        </div>" +
                "    </div>" +
                "</div>"
                ;
        }
        node.html(html);
        calcInstallCount();

        $(".plugin-closed-api").change(function () {
            if (this.checked) {
                showModal("pluginclosedapi", $(this), calcInstallCount);
                //$(this).prop("checked", returnVal);
            }
        });

        $(".plugin-switch").change(function () {
            calcInstallCount();
        });

        $("#getStartedBtn").on("click", function () {
            if ($(this).hasClass("disabled")) {
                return;
            }

            $("#gettingStartedWizard").css("display", "none");
            $(".getting-started-progress-panel").css("display", "block");

            var pkgs = [];
            $(".plugin-switch").each(function () {
                if ($(this).prop("checked")) {
                    var pkg = $(this).attr("package");
                    pkgs.push(pkg);
                }
            });
            var errors = [];
            var p;
            for (var pkg of pkgs) {
                PluginLoader.install(pkg);
            }
            $("#gs-plugin-progress").css("width", "100%");

            if (errors.length === 0) {
                setTimeout(function () {
                    window.location.reload();
                }, 500);
                return;
            }

            $(".getting-started-progress-panel").css("display", "none");
            $(".getting-started-plugin-error-panel").css("display", "block");

            var html = "<p>" + $.i18n("getting-started-error-plugin-network-error") + "</p><button class=\"btn btn-block btn-warning\" onclick=\"window.location.reload()\" type=\"button\">" + $.i18n("getting-started-error-refresh-btn") + "</button><hr /><p><b>" + $.i18n("getting-started-error-affected-plugins") + "</b><br />";
            var i;
            for (i = 0; i < errors.length; i++) {
                html += errors[i];
                if (i !== errors.length - 1) {
                    html += ", ";
                }
            }
            html += "</p>";

            $(".getting-started-plugin-error-panel .desc").html(html);
        });
    });
}