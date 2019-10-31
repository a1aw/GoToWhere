// GTW Plugin Loader

import * as Misc from './gtw-misc';
import repos from './plugins/repository.json';

export var plugins = {};

export var installedPlugins = [];

export function install(pkg, autoSave) {
    if (isInstalled(pkg)) {
        return false;
    }
    installedPlugins.push(pkg);
    if (autoSave !== false){
        save();
    }
    return true;
}

export function uninstall(pkg){
    var i;
    for (i = 0; i < installedPlugins.length; i++){
        if (installedPlugins[i] === pkg){
            installedPlugins.splice(i, 1);
            return true;
        }
    }
    return false;
}

export function getPlugin(pkg) {
    return plugins[pkg];
}

export function isInstalled(pkg) {
    for (var plugin of installedPlugins){
        if (plugin === pkg){
            return true;
        }
    }
    return false;
}

export function save() {
    var localStorage = window.localStorage;
    localStorage.setItem("gtw-plugins", JSON.stringify(installedPlugins));
    return true;
}

export function load(pc) {
    if (!localStorage){
        console.error("Error: LocalStorage is not supported in this browser.");
        return;
    }

    var pluginsStr = localStorage.getItem("gtw-plugins");

    if (pluginsStr) {
        installedPlugins = JSON.parse(pluginsStr);
    }
    
    if (!installedPlugins || typeof installedPlugins.length !== "number"){
        console.warn("Warning: Installed plugins JSON string is invalid. Resetting as empty.");
        save();
    }

    var info;
    var p;
    var proms = [];
    for (var installedPlugin of installedPlugins) {
        info = {
            pkg: installedPlugin,
            status: 1,
            msg: "Not Enabled"
        };

        if (repos[installedPlugin]){
            proms.push(new Promise((resolve, reject) => {
                import("./plugins/" + installedPlugin).then(function(mod) {
                    var msg;
                    if (!mod) {
                        msg = $.i18n("plugin-error-no-module-returned", pkg);
                        console.error(msg);
                        info.status = -2;
                        info.msg = msg;
                    } else if (!mod.onload || typeof mod.onload !== "function") {
                        msg = $.i18n("plugin-error-no-onload-function", pkg);
                        console.error(msg);
                        info.status = -3;
                        info.msg = msg;
                    } else {
                        var promise = new Promise((resolve, reject) => {
                            var status = mod.onload();
                            if (status instanceof Promise) {
                                status.then(resolve).catch(reject);
                            } else {
                                resolve(status);
                            }
                        });
                        promise.then(function (status) {
                            if (status) {
                                info.status = 0;
                                delete info.msg;
                            } else {
                                var msg = $.i18n("plugin-error-onload-function-error", pkg);
                                console.error(msg);
                                info.status = -4;
                                info.msg = msg;
                            }
                            resolve();
                        }).catch(reject);
                    }
                });
            }));
        } else {
            info.status = -1;
            info.msg = "This plugin is not available in this version of GoToWhere.";
        }
        plugins[installedPlugin] = info;
    }
    return Misc.allProgress(proms, pc);
}