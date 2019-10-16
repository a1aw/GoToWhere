//GTW UI

define(function (require, exports, module) {
    var TransitManager = require("gtw-citydata-transit");
    var Map = require("gtw-map");
    var Settings = require("gtw-settings");
    var RequestLimiter = require("gtw-requestlimiter");
    var PluginLoader = require("gtw-pluginloader");
    var Loc = require("gtw-location");
    var Misc = require("gtw-misc");
    var Lang = require("gtw-lang");

    $(document).ready(function () {
        $(".header-links-plugins").on("click", function () {
            exports.showModal("pluginmanager");
        });
        $(".header-links-settings").on("click", function () {
            exports.showModal("settings");
        });
        $(".header-links-about").on("click", function () {
            exports.showModal("about");
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

        exports.showTab(tab);
    });

    $(".ui-half-map-back-btn").on("click", function () {
        clearInterval(exports.timers["stopEtaUpdate"]);
        Map.setCenter(Loc.getCurrentPosition());
        Map.setZoom(16);
        Map.removeAllMarkers();
        Map.removeAllPolylines();
        exports.showPanel();
    });

    exports.currentTab = "transitEta";

    exports.vars = {};

    exports.modalVars = {};

    exports.timers = {};

    exports.modalTimers = [];

    exports.init = function () {
        exports.showTab("transitEta");
        adjustMargin();
        exports.showPanel();

        if (Object.keys(PluginLoader.plugins).length == 0) {
            exports.gettingStarted();
        }
    };

    var gettingStarted_reposJson = {};

    exports.gettingStarted = function () {
        $(".header nav").css("display", "none");
        $("#gettingStartedWizard").smartWizard({
            useURLhash: false,
            showStepURLhash: false
        });
        $(".top-panel").css("display", "none");
        $(".content-panel-container").css("display", "none");
        $(".getting-started-panel").css("display", "block");

        var html = "";
        for (var lang in Lang.locales) {
            html += "<option value=\"" + lang + "\">" + Lang.locales[lang] + " (" + lang + ")</option>";
        }
        $("#langSelect").html(html);
        $("#langSelect").on("change", function () {
            Lang.changeLanguage($(this).val());
        });

        $.ajax({
            url: "https://plugins.gotowhere.ga/repository.json",
            cache: false,
            dataType: "json",
            success: function (reposJson) {
                var byRegion = {};
                for (var category of reposJson) {
                    for (var plugin of category.plugins) {
                        if (!byRegion[plugin.region]) {
                            byRegion[plugin.region] = [];
                        }
                        byRegion[plugin.region].push(plugin);
                    }
                }
                $("#regionSelect").html("");
                var regionOptionsHtml = "<option value=\"notselected\">-- " + $.i18n("getting-started-wizard-step-plugins-select") + " --</option>";
                for (var region in byRegion) {
                    regionOptionsHtml += "<option value=\"" + region + "\"> " + region + "</option>";
                }
                $("#regionSelect").removeAttr("disabled")
                $("#regionSelect").html(regionOptionsHtml);
                gettingStarted_reposJson = reposJson;
            },
            error: function (err) {

            }
        });

        var calcInstallCount = function () {
            var reposJson = gettingStarted_reposJson;
            var totalCount = 0;
            var categoryCount;
            var node;
            var allCount = 0;
            for (var category of reposJson) {
                categoryCount = 0;
                $(".plugin-switch[category-id='" + category.id + "']").each(function () {
                    if ($(this).prop("checked")) {
                        categoryCount++;
                    }
                });
                node = $(".category-btn[category-id='" + category.id + "']");
                node.html(node.attr("category-name") + " (" + categoryCount + "/" + category.plugins.length + ")");
                totalCount += categoryCount;
                allCount += category.plugins.length;
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
            if (val == "notselected") {
                node.html("");
                installCountNode.html("");
                calcInstallCount();
                return;
            }

            var reposJson = gettingStarted_reposJson;

            var html = "";
            var pluginHtml;
            for (var category of reposJson) {
                installCount = 0;
                pluginHtml = "";
                for (var plugin of category.plugins) {
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
                    exports.showModal("pluginclosedapi", $(this), calcInstallCount);
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
                var proms = [];
                var p;
                for (var pkg of pkgs) {
                    p = new Promise((resolve, reject) => {
                        $.ajax({
                            url: "https://plugins.gotowhere.ga/repos/" + pkg + "/info.json",
                            cache: false,
                            dataType: "json",
                            success: function (info) {
                                PluginLoader.install(info.package, info.checksum, info.version);
                                resolve();
                            },
                            error: function (err) {
                                errors.push(pkg);
                                resolve();
                            }
                        });
                    });
                    proms.push(p);
                }
                Misc.allProgress(proms, function (p) {
                    $("#gs-plugin-progress").css("width", p + "%");
                }).then(function () {
                    if (errors.length == 0) {
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
                        if (i != errors.length - 1) {
                            html += ", ";
                        }
                    }
                    html += "</p>";

                    $(".getting-started-plugin-error-panel .desc").html(html);
                });
            });
        });
    }

    exports.clearUp = function () {
        Map.setCenter(Loc.getCurrentPosition());
        Map.setZoom(16);
        Map.removeAllMarkers();
        Map.removeAllPolylines();

        exports.vars = {};
        for (var key in exports.timers) {
            clearInterval(exports.timers[key]);
        }
        exports.timers = [];
        $(".tab-panel").html("");
        $(".content-panel-container").html("");
    };

    exports.modalClearUp = function () {
        exports.modalVars = {};
        for (var timer of exports.modalTimers) {
            clearInterval(timer);
        }
    };

    exports.showModal = function (layout, ...args) {
        //exports.nowUi = layout;
        //exports.previousUi = 0;
        exports.modalClearUp();
        exports.modalVars = {};

        exports.loadModalLayout(layout, true).then(function () {
            $(".modal").i18n();
            if (typeof exports.scripts[layout] === "function") {
                (exports.scripts[layout]).apply(this, args);
            }
        });
    };

    exports.loadModalLayout = function (layout, options = {}) {
        var key = "modal-" + layout;

        if (options === true) {
            options = {};
            options.backdrop = "static";
            options.keyboard = false;
        }

        var proms = [];
        proms.push(new Promise((resolve, reject) => {
            $(".modal-header").load("ui/" + key + "-header.html", resolve);
        }));
        proms.push(new Promise((resolve, reject) => {
            $(".modal-body").load("ui/" + key + "-body.html", resolve);
        }));
        proms.push(new Promise((resolve, reject) => {
            $(".modal-footer").load("ui/" + key + "-footer.html", resolve);
        }));

        var p = Promise.all(proms);
        p.then(function () {
            $(".modal").modal(options);
        });
        return p;
    };

    exports.hideModal = function () {
        $(".modal").modal("hide");
    };

    exports.isModalShown = function () {
        return ($(".modal").data('bs.modal') || {})._isShown;
    }

    exports.showTab = function (tab) {
        exports.clearUp();
        exports.currentTab = tab;
        exports.scripts[tab]();
    };

    exports.showPanel = function () {
        $(".content-panel-container").css("display", "inline-block");
        $(".top-panel").css("display", "block");
        $(".header nav").removeClass("gtw-half-map");

        $("body").removeClass("gtw-half-map");
        $("#gtw-map").removeClass("gtw-half-map");
        $(".map-overlay").removeClass("gtw-half-map");
        $(".half-map-panel").removeClass("gtw-half-map");
        $(".half-map-container").removeClass("gtw-half-map");

        //$(".header nav").addClass("bg-dark");
        //$(".half-map-panel").css("display", "none");
        //$(".top-panel").css("display", "block");
        //$(".half-map-container").css("display", "none");
        //$(".map-overlay").fadeIn(500);
        adjustMargin();
    };

    exports.hidePanel = function () {
        $(".top-panel").css("display", "none");
        $(".content-panel-container").css("display", "none");
        $(".header nav").addClass("gtw-half-map");

        //$("body").addClass("gtw-half-map");
        $("#gtw-map").addClass("gtw-half-map");
        $(".map-overlay").addClass("gtw-half-map");
        $(".half-map-panel").addClass("gtw-half-map");
        $(".half-map-container").addClass("gtw-half-map");
        
        //$(".half-map-panel").css("display", "block");
        //$(".half-map-container").css("display", "block");
        //$(".header nav").removeClass("bg-dark");
        //$(".map-overlay").fadeOut(500);
        adjustMargin();
    };

    exports.drawRouteOnMap = function (route, bound) {
        var path = route.paths[bound];

        var coords = [];
        var pos;
        var dbStop;
        var i;
        for (i = 0; i < path.length; i++) {
            dbStop = TransitManager.getStopById(path[i]);
            pos = { lat: dbStop.lat, lng: dbStop.lng };
            coords.push(pos);
            Map.addMarker(pos, dbStop.stopName, "" + (i + 1));
        }

        Map.addPolyline(coords, "#FF0000", 2);
    };

    exports.showRouteList = function (route, bound, stop = false, scroll = false) {
        var html = "<div class=\"row\" style=\"padding: 2%;\"><div class=\"timeline-centered\">";
        var path = route.paths[bound];
        var dbStop;
        var i;
        for (i = 0; i < path.length; i++) {
            dbStop = TransitManager.getStopById(path[i]);
            html +=
                "<article class=\"timeline-entry\" stop-id=\"" + dbStop.stopId + "\" stop-index=\"" + i + "\">" +
                "    <div class=\"timeline-entry-inner\">" +
                "        <div class=\"timeline-icon bg-light\">" +
                "            " + (i + 1) +
                "        </div>" +
                "        <div class=\"timeline-label\">" +
            "            <h2><button style=\"padding: 0px;\" class=\"btn btn-link\" stop-id=\"" + dbStop.stopId + "\">" + dbStop.stopName + "</button></h2>" +
                "            <p></p>" +
                "        </div>" +
                "    </div>" +
                "</article>"
                ;
        }
        html += "</div></div>";
        $(".half-map-container").html(html);

        $(".half-map-container button").on("click", function () {
            var x = TransitManager.getStopById($(this).attr("stop-id"));
            if (x) {
                exports.showRouteList(route, bound, x);
            }
        });

        var lastStopId = path[path.length - 1];
        html =
            "<ul class=\"list-group\"><li class=\"list-group-item d-flex align-items-center route-selection\">" +
            "    <div class=\"d-flex flex-column route-id\">" +
            "        <div>" + route.provider + "</div>" +
            "        <div>" + route.routeId + "</div>" +
            "    </div>" +
            "    <div><b>To:</b> " + TransitManager.getStopById(lastStopId).stopName + "</div>" +
            "</li></ul>"
            ;
        $(".half-map-tab-panel").html(html);

        adjustMargin();
        if (stop) {
            var parent = screen.width >= 768 ? ".desktop" : ".mobile";

            var node = $(parent + " .timeline-entry[stop-id='" + stop.stopId + "']");

            var icon = node.children().children(".timeline-icon")
            icon.removeClass("bg-light");
            icon.addClass("bg-primary");

            if (scroll) {
                node[0].scrollIntoView();
            }

            var targetPos = { lat: stop.lat, lng: stop.lng };

            Map.setCenter(targetPos);
            Map.setZoom(18);

            clearInterval(exports.timers["stopEtaUpdate"]);
            var func = function () {
                exports.showStopEta(route, bound, stop);
            };
            func();
            exports.timers["stopEtaUpdate"] = setInterval(func, 30000);
        }
    };

    exports.showStopEta = function (route, bound, stop) {
        var node = $(".timeline-entry[stop-id='" + stop.stopId + "'] p");

        var content =
            "<p><u>" + $.i18n("transit-eta") + "</u></p>" +
            "<table class=\"table stop-eta\">"
            ;

        var p = TransitManager.fetchEta({
            provider: route.provider,
            routeId: route.routeId,
            selectedPath: parseInt(bound),
            stopId: stop.stopId
        });
        if (!p) {
            content +=
                "<tr class=\"table-dark\">" +
                "    <td colspan=\"2\">" + $.i18n("transit-eta-route-not-available") + "</td>" +
                //"    <td>---</td>" +
                "</tr>"
                ;
        } else {
            content +=
                "<tr class=\"table-dark\">" +
                "    <td colspan=\"2\"><div class=\"spinner-border spinner-border-sm\" role=\"status\"></div> " + $.i18n("transit-eta-retrieving-data") + "</td>" +
                "</tr>";
            p.then(function (data) {
                var h = data.options;
                console.log(data);
                var content = "";
                var node = $(".timeline-entry[stop-id='" + h.stopId + "'] p table tbody");
                if (!data || !data.schedules || !data.serverTime) {
                    content +=
                        "<tr class=\"table-dark\">" +
                        "    <td colspan=\"2\">" + $.i18n("transit-eta-no-data-received") + "</td>" +
                        //"    <td>---</td>" +
                        "</tr>"
                        ;
                } else if (data.schedules.length == 0) {
                    content +=
                        "<tr class=\"table-dark\">" +
                        "    <td colspan=\"2\">" + $.i18n("transit-eta-no-schedules-pending") + "</td>" +
                        //"    <td>---</td>" +
                        "</tr>"
                        ;
                } else {
                    var active = false;
                    for (var schedule of data.schedules) {
                        var eta = Math.floor((schedule.time - data.serverTime) / 1000 / 60);

                        var html = "<tr class=\"table-";

                        if (eta >= 20) {
                            html += "secondary";
                        } else if (eta >= 15) {
                            html += "info";
                        } else if (eta >= 10) {
                            html += "success";
                        } else if (eta >= 5) {
                            html += "warning";
                        } else if (eta >= 1) {
                            html += "danger"
                        } else {
                            html += "dark";
                        }

                        if (!active && eta > 0) {
                            active = true;
                            html += " active";
                        }

                        html += "\">";

                        //TODO: isOutdated

                        if (schedule.hasMsg && !schedule.hasTime) {
                            html += "<td colspan=\"2\">" + schedule.msg + "</td>";
                        } else {
                            html += "<td>";
                            if (schedule.hasMsg) {
                                html += schedule.msg;
                            }
                            if (schedule.hasTime) {
                                if (schedule.hasMsg) {
                                    html += "<br />";
                                }
                                if (eta > 0) {
                                    html += $.i18n("transit-eta-minutes", eta);
                                } else {
                                    html += $.i18n("transit-eta-arrived-left");
                                }

                                if (schedule.isLive) {
                                    html += " <span style=\"color: red; float: right; font-size: 10px;\"><i class=\"fa fa-circle\"></i> " + $.i18n("transit-eta-live") + "</span>";
                                } else {
                                    html += " <span style=\"font-size: 10px; float: right; font-style: italic;\">" + $.i18n("transit-eta-scheduled") + "</span>";
                                }
                            }

                            html += "</td><td>";

                            var time = new Date(schedule.time);

                            if (schedule.hasTime) {
                                html += Misc.fillZero(time.getHours()) + ":" + Misc.fillZero(time.getMinutes());
                            } else {
                                html += "---";
                            }

                            html += "</td>";
                        }

                        //TODO: Features

                        html += "</tr>"
                        content += html;
                    }
                }
                node.html(content);
            }).catch(function (options, err) {
                var node = $(".timeline-entry[stop-id='" + options.stopId + "'] p table tbody");
                node.html("<tr class=\"table-danger\"><td colspan=\"2\">" + $.i18n("transit-eta-scheduled") + "</td></tr>");
            });
        }

        content += "</table>";

        node.html(content);
    };

    exports.scripts = {
        "pluginclosedapi": function (node, func) {
            $("#plugin-closed-api-confirm-yes").on("click", function () {
                func();
                exports.hideModal();
            });
            $("#plugin-closed-api-confirm-no").on("click", function () {
                node.prop("checked", false);
                func();
                exports.hideModal();
            });
        },
        "errorplugins": function (errorPlugins) {
            var node = $("#errorPluginsAccordion");
            var html = "";
            var errSummary;
            for (var plugin of errorPlugins) {
                if (plugin.status >= -2 && plugin.status <= -1) {
                    errSummary = $.i18n("error-plugins-summary-network-error")  + " (" + plugin.status + ")";
                } else if (plugin.status >= -7 && plugin.status <= -3) {
                    errSummary = $.i18n("error-plugins-summary-plugin-load") + " Error (" + plugin.status + ")";
                } else if (plugin.status >= -9 && plugin.status <= -8) {
                    errSummary = $.i18n("error-plugins-summary-checksum-mismatch") + " (" + plugin.status + ")";
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

                if (plugin.status >= -2 && plugin.status <= -1) {
                    html += $.i18n("error-plugins-solution-network-error");
                } else if (plugin.status >= -7 && plugin.status <= -3) {
                    html += $.i18n("error-plugins-solution-plugin-load", plugin.status);
                } else if (plugin.status >= -9 && plugin.status <= -8) {
                    html += $.i18n("error-plugins-solution-checksum-mismatch") + "<br/><button class=\"btn btn-warning error-plugin-accept-checksum-btn\" type=\"button\" package=\"" + plugin.package + "\">" + $.i18n("error-plugins-solution-checksum-mismatch-accept-btn") + "</button>";
                } else {
                    html += $.i18n("error-plugins-solution-unknown-status-code", plugin.status);
                }
                html += "</p>"

                html +=
                    "        </div>" +
                    "    </div>" +
                    "</div>"
                    ;
            }
            node.html(html);

            $(".error-plugin-accept-checksum-btn").on("click", function () {
                var pkg = $(this).attr("package");

                var plugin = PluginLoader.plugins[pkg];
                if (!pkg) {
                    console.error("Error: Accept checksum failed! Plugin \"" + pkg + "\" not found!");
                    return;
                }

                var info = plugin.info;
                PluginLoader.install(info.package, info.checksum, info.version);
                window.location.reload();
            });
        },
        "viewplugin": function (reposJson, package) {
            console.log(reposJson);
            console.log(package);
            $(".modal .close").on("click", function () {
                exports.showModal("pluginmanager");
            });

            var packageJson = 0;
            for (var category of reposJson) {
                for (var json of category.plugins) {
                    if (json.package === package) {
                        packageJson = json;
                        break;
                    }
                }

                if (packageJson) {
                    break;
                }
            }

            exports.modalVars["reposJson"] = reposJson;
            exports.modalVars["packageJson"] = packageJson;

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

            var localChecksum = 0;

            html += "<h3>" + $.i18n("view-plugin-installation") + "</h3>";
            html += "<hr />";

            var json = PluginLoader.getPlugin(packageJson.package);

            var statusMsg = "<span class=\"font-weight-bold ";
            if (!json) {
                statusMsg += "text-info\">" + $.i18n("view-plugin-installation-not-installed");
            } else if (json.status == -1) {
                statusMsg += "text-danger\">" + $.i18n("view-plugin-installation-installed-but-could-not-start-up-correctly");
            } else if (json.status == 0) {
                statusMsg += "text-success\">" + $.i18n("view-plugin-installation-installed-running");
            } else if (json.status == 1) {
                statusMsg += "text-secondary\">" + $.i18n("view-plugin-installation-not-enabled");
            } else if (json.status <= -2 && json.status >= -7) {
                statusMsg += "text-danger\">" + $.i18n("view-plugin-installation-plugin-load-errors", json.status);
            } else if (json.status <= -8 && json.status >= -9) {
                statusMsg += "text-danger\">" + $.i18n("view-plugin-installation-checksum-mismatch", json.status);
            } else {
                statusMsg += "text-secondary\">" + $.i18n("view-plugin-installation-unknown-status-code", json.status);
            }
            statusMsg += "</span>";

            html += "<p>" + $.i18n("view-plugin-installation-status") + ": " + statusMsg + "<br />";

            if (json && json.msg) {
                html += $.i18n("view-plugin-installation-message") + ": " + json.msg + "</p>";
            }

            if (json) {
                html += $.i18n("view-plugin-installation-local-version") + ": " + json.local.version + "<br />";
                html += $.i18n("view-plugin-installation-local-checksum") + ": " + json.local.checksum + "<br />";
                html += $.i18n("view-plugin-installation-online-checksum") + ": " + packageJson.checksum + "<br />";
                html += $.i18n("view-plugin-installation-checksum-validity") + ": <span class=\"font-weight-bold " +
                    (packageJson.checksum === json.local.checksum ? "text-success\">" + $.i18n("view-plugin-installation-checksum-validity-valid") : "text-danger\">" + $.i18n("view-plugin-installation-checksum-validity-invalid")) + "</span></p>";
            }

            html += "<hr />";

            if (json) {
                html += "<button type=\"button\" class=\"btn btn-danger ui-btn-viewplugin-uninstall\">" + $.i18n("view-plugin-installation-uninstall-and-restart-btn") + "</button>";
            } else {
                html += "<button type=\"button\" class=\"btn btn-success ui-btn-viewplugin-install\">" + $.i18n("view-plugin-installation-install-and-restart-btn") + "</button>";
            }

            $(".modal-body").html(html);

            $(".ui-btn-viewplugin-install").on("click", function () {
                PluginLoader.install(packageJson.package, packageJson.checksum, packageJson.version);
                window.location.reload();
            });

            $(".ui-btn-viewplugin-uninstall").on("click", function () {
                PluginLoader.uninstall(packageJson.package);
                window.location.reload();
            });
        },

        "pluginmanager": function () {
            var html = "<p>" + $.i18n("plugin-manager-loading") + "</p>";

            $("#nav-all").html(html);
            $("#nav-installed").html(html);
            $("#nav-transit").html(html);
            $("#nav-libraries").html(html);
            $("#nav-others").html(html);

            $.ajax({
                url: "https://plugins.gotowhere.ga/repository.json",
                dataType: "json",
                success: function (reposJson) {
                    exports.modalVars["reposJson"] = reposJson;

                    if (!reposJson || !reposJson.length) {
                        alert("TODO: Handle invalid repos JSON error");
                        return;
                    }

                    var allHtml = "<div class=\"list-group\">";
                    var tabNode = $("#nav-tab");
                    var tabContentNode = $("#nav-tabContent");
                    var pluginHtml;
                    var categoryTabHtml;
                    var categoryTabContentHtml;
                    var total = 0;
                    for (var category of reposJson) {
                        total += category.plugins.length;
                        categoryTabHtml = "<a class=\"nav-item nav-link\" id=\"nav-" + category.id + "-tab\" data-toggle=\"tab\" href=\"#nav-" + category.id + "\" role=\"tab\" aria-controls=\"nav-" + category.id + "\" aria-selected=\"true\">" + category.name + " (" + category.plugins.length + ")</a>";
                        categoryTabContentHtml = "<div class=\"tab-pane fade\" id=\"nav-" + category.id + "\" role=\"tabpanel\" aria-labelledby=\"nav-" + category.id + "-tab\"><div class=\"list-group\">";
                        for (var pluginJson of category.plugins) {
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
                        exports.showModal("viewplugin", exports.modalVars["reposJson"], $(this).attr("package"));
                    });
                },
                error: function () {

                }
            });
        },

        "settings": function () {
            var html = "";

            var val;
            for (var setting of Settings.getDefaultSettings()) {
                val = Settings.get(setting.key, setting.def);
                html +=
                    "<div class=\"form-group\">" +
                    "    <label><b>" + setting.name + ":</b><p>" + setting.desc + "</p></label>";
                if (setting.type == "boolean") {
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
                    if (setting.type == "number") {
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
                    if (setting.type == "boolean") {
                        out = val == "yes";
                    } else if (setting.type == "number") {
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
                    exports.hideModal();
                }
            });
        },

        "transitEtaUpdateUi": function () {
            var requestLen = RequestLimiter.requests.length;
            if (requestLen > 0) {
                $(".request-progress-panel").fadeIn(500);

                var max = exports.vars["maxRequest"];
                if (!max || requestLen > max) {
                    max = exports.vars["maxRequest"] = requestLen;
                }

                $(".request-progress-panel .progress-bar").html($.i18n("transit-eta-requesting-data", (max - requestLen), max));
                //$(".request-progress-panel .progress-bar").html(Math.floor((max - requestLen) / max * 100) + "%");
                $(".request-progress-panel .progress-bar").css("width", Math.floor((max - requestLen) / max * 100)+ "%");
            } else {
                exports.vars["maxRequest"] = 0;
                $(".request-progress-panel .progress-bar").css("width", "100%");
                $(".request-progress-panel").fadeOut(500, function () {
                    $(".request-progress-panel .progress-bar").css("width", "0%");
                });
            }
            var allNearbyRoutes = exports.vars["allNearbyRoutes"];
            //var h;
            for (var result of allNearbyRoutes) {
                var p = TransitManager.fetchEta({
                    provider: result.route.provider,
                    routeId: result.route.routeId,
                    selectedPath: result.bound,
                    stopId: result.stop.stopId
                });
                p.then(function (eta) {
                    var text = "";
                    var h = eta.options;
                    console.log(eta);
                    var node = $(".nearby-route-list .route-selection[gtw-provider=\"" + h.provider + "\"][gtw-route-id=\"" + h.routeId + "\"][gtw-bound=\"" + h.selectedPath + "\"][gtw-stop-id=\"" + h.stopId + "\"]");

                    node.removeClass("list-group-item-secondary");
                    node.removeClass("list-group-item-info");
                    node.removeClass("list-group-item-success");
                    node.removeClass("list-group-item-warning");
                    node.removeClass("list-group-item-danger");
                    node.removeClass("list-group-item-light");
                    node.removeClass("list-group-item-dark");

                    var badgeClass = "btn-secondary";

                    if (!eta || !eta.schedules || !eta.serverTime) {
                        text = $.i18n("transit-eta-route-not-available-short");
                        node.addClass("list-group-item-light");
                    } else if (eta.schedules.length == 0) {
                        text = $.i18n("transit-eta-no-schedules-pending-short");
                        node.addClass("list-group-item-light");
                    } else {
                        var schedule = eta.schedules[0];

                        var eta = Math.floor((schedule.time - eta.serverTime) / 1000 / 60);

                        var css = "";

                        if (eta >= 20) {
                            css = "secondary";
                        } else if (eta >= 15) {
                            css = "info";
                        } else if (eta >= 10) {
                            css = "success";
                        } else if (eta >= 5) {
                            css = "warning";
                        } else if (eta >= 1) {
                            css = "danger"
                        } else {
                            css = "dark";
                        }
                        node.addClass("list-group-item-" + css);

                        //TODO: isOutdated

                        if (schedule.hasMsg) {
                            var msg = schedule.msg;
                            if (msg.length > 20) {
                                text = $.i18n("transit-eta-transit-notice");
                            } else {
                                text = schedule.msg;
                            }
                            badgeClass = "badge-warning";
                        } else if (schedule.hasTime) {
                            if (schedule.hasMsg) {
                                text += "<br />";
                            }

                            badgeClass = "badge-primary";
                            if (eta > 0) {
                                text += $.i18n("transit-eta-minutes", eta);
                            } else {
                                text += $.i18n("transit-eta-arrived-left", eta);
                                badgeClass = "badge-dark";
                            }

                            text += "<br /><span style=\"font-size: 10px; position: absolute; top: 16px; right: 16px; "
                            if (schedule.isLive) {
                                text += "color: red;\"><i class=\"fa fa-circle\"></i> " + $.i18n("transit-eta-live") + "</span>";
                            } else {
                                text += "color: black; font-style: italic;\">" + $.i18n("transit-eta-scheduled") + "</span>";
                            }
                        }

                        /*
                        if (schedule.hasTime) {
                            text += Misc.fillZero(schedule.time.hr) + ":" + Misc.fillZero(schedule.time.min);
                        } else {
                            text += "---";
                        }
                        */

                        //TODO: Features
                    }
                    var badge = node.children(".transit-eta");

                    badge.removeClass("badge-primary");
                    badge.removeClass("badge-secondary");
                    badge.removeClass("badge-warning");
                    badge.removeClass("badge-danger");
                    badge.removeClass("badge-dark");
                    badge.addClass(badgeClass);

                    badge.html(text);
                }).catch(function (options, err) {
                    var node = $(".nearby-route-list .route-selection[gtw-provider=\"" + options.provider + "\"][gtw-route-id=\"" + options.routeId + "\"][gtw-bound=\"" + options.selectedPath + "\"][gtw-stop-id=\"" + options.stopId + "\"]");

                    node.removeClass("list-group-item-secondary");
                    node.removeClass("list-group-item-info");
                    node.removeClass("list-group-item-success");
                    node.removeClass("list-group-item-warning");
                    node.removeClass("list-group-item-danger");
                    node.removeClass("list-group-item-light");
                    node.removeClass("list-group-item-dark");
                    node.addClass("list-group-item-light");

                    var badge = node.children(".transit-eta");

                    badge.removeClass("badge-primary");
                    badge.removeClass("badge-secondary");
                    badge.removeClass("badge-warning");
                    badge.removeClass("badge-danger");
                    badge.removeClass("badge-dark");
                    badge.addClass("badge-danger");

                    badge.html("Failed");
                });
            }
        },
        "transitEta": function () {
            RequestLimiter.clear();
            TransitManager.clearCache();

            var pos = Loc.getCurrentPosition();
            var providers = TransitManager.getProviders();

            if (providers.length > 0) {
                var buttonScroll =
                    "<div class=\"hori-scroll btn-group\">" +
                    "    <button type=\"button\" class=\"btn btn-primary gtw-providersort gtw-providersort-all\"><i class=\"fa fa-reply-all\"></i><br />" + $.i18n("transit-eta-sort-all") + "</button>";

                for (var provider of providers) {
                    var image = "";
                    if (provider.transit == TransitType.TRANSIT_BUS) {
                        image = "fa-bus";
                    } else if (provider.transit == TransitType.TRANSIT_METRO || provider.transit == TransitType.TRANSIT_TRAIN) {
                        image = "fa-train";
                    } else {
                        image = "fa-question";
                    }
                    buttonScroll += " <button type=\"button\" class=\"btn btn-default gtw-providersort gtw-providersort-provider\" gtw-provider=\"" + provider.name + "\"><i class=\"fa " + image + "\"></i><br />" + provider.name + "</button>";
                }

                buttonScroll += "</div>";

                $(".tab-panel").append(buttonScroll);

                var searchField =
                    "<div class=\"input-group mb-3\" style=\"margin-top: 16px;\">" +
                    "    <input type=\"text\" class=\"form-control\" placeholder=\"" + $.i18n("transit-eta-placeholder-search-for-transit") + "\" aria-label=\"" + $.i18n("transit-eta-placeholder-search-for-transit") + "\" aria-describedby=\"search-transit-icon\" id=\"search-transit-text\"/>" +
                    "    <div class=\"input-group-append\">" +
                    //"        <span class=\"input-group-text\" id=\"search-transit-icon\"><i class=\"fas fa-search\"></i></span>" +
                    "        <button class=\"btn btn-light disabled\" type=\"button\" id=\"button-cancel-search\"><i class=\"fas fa-search\"></i></button>" + 
                    "    </div>" +
                    "</div>"
                    ;

                $(".tab-panel").append(searchField);

                var requestProgressBar =
                    "<div class=\"request-progress-panel\">" +
                    "    <div class=\"progress bg-white\">" +
                    "        <div class=\"progress-bar progress-bar-striped progress-bar-animated\" role=\"progressbar\" style=\"width: 0%;\"></div>" +
                    "    </div>" +
                    "</div>"
                    ;

                $(".tab-panel").append(requestProgressBar);

                $(".gtw-providersort").on("click", function () {
                    if ($(this).hasClass("btn-primary")) {
                        return;
                    }
                    $(".gtw-providersort").removeClass("btn-primary");
                    //$(".gtw-providersort").removeClass("btn-default");

                    if ($(this).hasClass("gtw-providersort-all")) {
                        $(this).addClass("btn-primary");

                        //$(".gtw-providersort-provider").addClass("btn-default");
                    } else {
                        var provider = $(this).attr("gtw-provider");
                        console.log('Provider' + provider)
                        $(this).addClass("btn-primary");

                        $(".gtw-providersort-provider:not([gtw-provider='" + provider + "'])").addClass("btn-default");
                    }
                });
                
                var lat = pos.lat;
                var lng = pos.lng;
                var range = Settings.get("min_nearby_transit_range", 200) / 1000.0;

                var allNearbyStops = TransitManager.getAllStopsNearbyCoord(lat, lng, range, true, true);

                if (allNearbyStops.length == 0) {
                    var testRange = range;
                    do {
                        testRange += 0.05;
                        allNearbyStops = TransitManager.getAllStopsNearbyCoord(lat, lng, testRange, true, true);
                    } while (allNearbyStops.length == 0 && testRange < 10);

                    if (testRange >= 10) {
                        $(".tab-panel").append(
                            "<div class=\"alert alert-danger alert-dismissable\">" +
                            "<button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-hidden=\"true\" >&#215;</button>" +
                            "No routes are found in 10 km range." +
                            "</div>"
                        );
                    } else {
                        $(".tab-panel").append(
                            "<div class=\"alert alert-warning alert-dismissable\">" +
                            "<button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-hidden=\"true\" >&#215;</button>" +
                            $.i18n("transit-eta-no-routes-found-nearby-extended-range", range * 1000, Math.ceil(testRange * 1000)) +
                            "</div>"
                        );
                    }
                }

                var maxNearbyBusDisplay = Settings.get("max_nearby_transit_to_display", 20);
                var allNearbyRoutes = [];
                for (var stopResult of allNearbyStops) {
                    if (allNearbyRoutes.length >= maxNearbyBusDisplay) {
                        break;
                    }

                    var routeResults = TransitManager.searchRoutesOfStop(stopResult.stop);

                    for (var routeResult of routeResults) {
                        allNearbyRoutes.push({
                            route: routeResult.route,
                            bound: routeResult.bound,
                            stop: stopResult.stop,
                            distance: stopResult.distance,
                        });
                    }
                }

                var html;
                var distance;
                var paths;
                var stopId;
                html = "<div class=\"row item-list nearby-route-list\"><ul class=\"list-group\">"
                for (var result of allNearbyRoutes) {
                    paths = result.route.paths[result.bound];
                    stopId = paths[paths.length - 1];
                    distance = Math.round(result.distance * 1000);
                    html +=
                        "    <li class=\"list-group-item list-group-item-action d-flex justify-content-between align-items-center route-selection\" gtw-provider=\"" + result.route.provider + "\" gtw-route-id=\"" + result.route.routeId + "\" gtw-stop-id=\"" + result.stop.stopId + "\" gtw-bound=\"" + result.bound + "\">" +
                        "        <div class=\"d-flex flex-column route-id\">" +
                        "            <div>" + result.route.provider + "</div>" +
                        "            <div>" + result.route.routeId + "</div>" +
                        "        </div>" +
                        "        <div class=\"d-flex flex-column stop-info mr-auto\">" +
                        "            <div>" +
                        "                <b>To:</b> <small>" + TransitManager.getStopById(stopId).stopName +
                        "</small></div>" +
                        "            <div>" +
                        "                " + result.stop.stopName + " (" + distance + "m)" +
                        "            </div>" +
                        "        </div>" +
                        "        <span class=\"badge badge-primary badge-pill transit-eta\">" + $.i18n("transit-eta-retrieving") + "</span>" +
                        "    </li>";
                }
                html += "</ul></div>";

                var routes = TransitManager.getAllRoutes();
                var path;
                var i;

                html += "<div class=\"row item-list all-route-list\"><ul class=\"list-group\">";

                for (var route of routes) {
                    for (i = 0; i < route.paths.length; i++) {
                        path = route.paths[i];
                        stopId = path[path.length - 1];
                        html +=
                            "<li class=\"list-group-item list-group-item-action d-flex align-items-center route-selection\" gtw-provider=\"" + route.provider + "\" gtw-route-id=\"" + route.routeId + "\" gtw-bound=\"" + i + "\">" +
                            "    <div class=\"d-flex flex-column route-id\">" +
                            "        <div>" + route.provider + "</div>" +
                            "        <div>" + route.routeId + "</div>" +
                            "    </div>" +
                            "    <div><b>To:</b> " + TransitManager.getStopById(stopId).stopName + "</div>" +
                            "</li>";
                    }
                }
                html += "</ul></div>";

                $(".content-panel-container").html(html);

                $(".route-selection").on("mouseenter", function () {
                    Map.removeAllMarkers();
                    Map.removeAllPolylines();
                    var provider = TransitManager.getProvider($(this).attr("gtw-provider"));
                    var route = provider.getRouteById($(this).attr("gtw-route-id"));
                    var stop = TransitManager.getStopById($(this).attr("gtw-stop-id"));
                    var bound = $(this).attr("gtw-bound");
                    exports.drawRouteOnMap(route, bound);

                    if (stop) {
                        var targetPos = { lat: stop.lat, lng: stop.lng };
                        Map.setCenter(targetPos);
                        Map.setZoom(18);
                    } else {
                        var path = route.paths[bound];

                        var latlngs = [];
                        var stop;
                        for (var stopId of path) {
                            stop = TransitManager.getStopById(stopId);
                            latlngs.push({lat: parseFloat(stop.lat), lng: parseFloat(stop.lng)});
                        }
                        Map.fitBounds(latlngs);
                    }
                });

                $(".route-selection").on("mouseleave", function () {
                    //Map.setCenter(Loc.getCurrentPosition());
                    //Map.setZoom(16);
                    //Map.removeAllMarkers();
                    //Map.removeAllPolylines();
                });

                $(".route-selection").on("click", function () {
                    exports.hidePanel();

                    Map.removeAllMarkers();
                    Map.removeAllPolylines();

                    var provider = TransitManager.getProvider($(this).attr("gtw-provider"));
                    var route = provider.getRouteById($(this).attr("gtw-route-id"));
                    var stop = TransitManager.getStopById($(this).attr("gtw-stop-id"));
                    var bound = $(this).attr("gtw-bound");

                    exports.showRouteList(route, bound, stop, true);
                    exports.drawRouteOnMap(route, bound);
                });

                $("#button-cancel-search").on("click", function () {
                    if (!$(this).hasClass("disabled")) {
                        $("#search-transit-text").val("");
                        $("#button-cancel-search").addClass("btn-light");
                        $("#button-cancel-search").addClass("disabled");
                        $("#button-cancel-search").removeClass("btn-danger");
                        $("#button-cancel-search").html("<i class=\"fas fa-search\"></i>");

                        $(".nearby-route-list").css("display", "flex")
                        $(".all-route-list").css("display", "none");
                        Map.setCenter(Loc.getCurrentPosition());
                        Map.setZoom(16);
                        Map.removeAllMarkers();
                        Map.removeAllPolylines();
                    }
                });

                $("#search-transit-text").on("input", function () {
                    var val = $(this).val();
                    if (val && val != "") {
                        $("#button-cancel-search").removeClass("btn-light");
                        $("#button-cancel-search").removeClass("disabled");
                        $("#button-cancel-search").addClass("btn-danger");
                        $("#button-cancel-search").html("<i class=\"fas fa-times\"></i>");

                        $(".nearby-route-list").css("display", "none")
                        $(".all-route-list").css("display", "flex");
                        Map.setCenter(Loc.getCurrentPosition());
                        Map.setZoom(16);
                        Map.removeAllMarkers();
                        Map.removeAllPolylines();
                    } else {
                        $("#button-cancel-search").addClass("btn-light");
                        $("#button-cancel-search").addClass("disabled");
                        $("#button-cancel-search").removeClass("btn-danger");
                        $("#button-cancel-search").html("<i class=\"fas fa-search\"></i>");

                        $(".nearby-route-list").css("display", "flex")
                        $(".all-route-list").css("display", "none");
                    }

                    $(".all-route-list .route-selection").each(function () {
                        var routeId = $(this).attr("gtw-route-id");
                        var providerName = $(this).attr("gtw-provider");
                        var bound = $(this).attr("gtw-bound");

                        var provider = TransitManager.getProvider(providerName);
                        var route = provider.getRouteById(routeId);
                        var paths = route.paths[bound];
                        var lastStop = TransitManager.getStopById(paths[paths.length - 1]);

                        var rp = Misc.similarity(routeId, val);
                        var pp = Misc.similarity(providerName, val);
                        var sp = Misc.similarity(lastStop.stopName, val);

                        if (rp < 0.3 && pp < 0.3 && sp < 0.3) {
                            $(this).attr("style", "display: none!important");
                            $(this).attr("sim", "0.0");
                        } else {
                            $(this).attr("style", "display: block");
                            $(this).attr("sim", Math.round(Math.max(rp, pp, sp) * 1000) / 1000);
                        }
                    });

                    var list = $(".all-route-list .route-selection").get();
                    list.sort(function (a, b) {
                        return $(b).attr("sim") - $(a).attr("sim");
                    });
                    for (var i = 0; i < list.length; i++) {
                        list[i].parentNode.appendChild(list[i]);
                    }
                    $(".all-route-list .route-selection:nth-child(1)").mouseenter();
                });

                exports.vars["allNearbyRoutes"] = allNearbyRoutes;
                exports.scripts["transitEtaUpdateUi"]();
                exports.timers["nearbyRoutesUpdate"] = (setInterval(function () {
                    exports.scripts["transitEtaUpdateUi"]();
                }, 30000));
            } else {
                //TODO: better message or auto add plugins according to region
                $(".tab-panel").html("<br /><div class=\"alert alert-danger\" role=\"alert\"><i class=\"fas fa-exclamation-triangle\"></i> " + $.i18n("transit-eta-no-plugins-providing-transit-data") + "</div>")
            }
        }
    };
});