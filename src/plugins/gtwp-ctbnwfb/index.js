//GTWP NWST Plugin
import * as Cors from './gtw-cors';
import * as Lang from './gtw-lang';
import * as Transit from './gtw-citydata-transit';
import * as TransitRoutes from './gtw-citydata-transitroutes';
import * as TransitStops from './gtw-citydata-transitstops';
import * as TransitEta from './gtw-citydata-transiteta';

function parseIsoDatetime(dtstr) {
    var dt = dtstr.split(/[: T-]/).map(parseFloat);
    return new Date(dt[0], dt[1] - 1, dt[2], dt[3] || 0, dt[4] || 0, dt[5] || 0, 0);
}

export function onload() {
    Cors.register("db.kmbeta.ml", true);
    Cors.register("rt.data.gov.hk", true);
    TransitEta.registerProvider(TransitType.BUS, "CTB", {
        default: "CTB",
        en: "CTB",
        zh: "城巴"
    }, new CtbProvider());
    TransitEta.registerProvider(TransitType.BUS, "NWFB", {
        default: "NWFB",
        en: "NWFB",
        zh: "新巴"
    }, new NwfbProvider());
    return true;
};

var shared_processDb = function (data, company) {
    var routes = data.routes;
    var stops = data.stops;
    var outRoutes = [];

    var i;
    for (i = 0; i < routes.length; i++) {
        if (routes[i].provider == company) {
            outRoutes.push(routes[i]);
        }
    }

    return {
        type: data.type,
        provider: company,
        routes: outRoutes,
        stops: stops,
        version: data.version
    };
};

var shared_getEta = function (data, company, opt) {
    var srvTime = new Date();
    var s = [];

    if (data) {
        srvTime = parseIsoDatetime(data["generated_timestamp "]);

        var sches = data.data;
        for (i = 0; i < sches.length; i++) {
            sche = sches[i];
            if (!sche || sche === "") {
                continue;
            }

            var eta = parseIsoDatetime(sche["eta"]);

            var options = {};

            //Cannot determine Scheduled/Live time!
            //options.isLive = true; //status[0].indexOf("Scheduled") !== -1;

            options.type = TransitType.BUS;
            options.provider = company;
            options.serverTime = srvTime.getTime();

            var lang = Lang.getLanguage();
            var locale = Lang.getLocale();
            var rmk;
            if (lang === "zh-cn") {
                rmk = sche["rmk_sc"];
            } else if (lang === "zh-hk" || locale === "zh") {
                rmk = sche["rmk_tc"];
            } else {
                rmk = sche["rmk_en"];
            }

            if (rmk) {
                options.msg = rmk;
            }

            var ms = eta.getTime();
            if (!isNaN(ms)) {
                options.time = ms;
            }

            s.push(options);
        }
    } else {
        return false;
    }

    var out = {
        options: opt,
        schedules: s,
        serverTime: srvTime.getTime()
    };
    return out;
};

var shared_fetchEta = function (provider, company, resolve, reject, opt) {
    var dbRoute = TransitRoutes.getRouteById(opt.routeId);
    var dbStop = TransitStops.getStopById(opt.stopId);

    var refRoute = provider.getRouteById(dbRoute.routeName);
    if (!refRoute) {
        console.error("Error: Could not get CTBNWFB reference by database route name. Aborting fetch ETA.");
        reject();
        return;
    } else if (refRoute.paths.length !== dbRoute.paths.length || opt.selectedPath >= refRoute.paths.length) {
        console.error("Error: " + dbRoute.routeName + " CTBNWFB reference database mismatch. Aborting fetch ETA.");
        reject();
        return;
    }

    var dbIndex = Transit.getStopIndex(dbRoute, dbStop, opt.selectedPath);
    var refStopId = refRoute.paths[opt.selectedPath][dbIndex];
    var refStop = provider.getStopById(refStopId);

    if (!refStop) {
        console.error("Error: Could not get " + dbStop.stopId + " CTBNWFB reference stop. Aborting fetch ETA.");
        reject();
        return;
    }

    var url = "https://rt.data.gov.hk/v1/transport/citybus-nwfb/eta/" + company + "/" + refStop.stopId + "/" + refRoute.routeId;
    $.ajax({
        url: url,
        dataType: "json",
        cache: false,
        success: function (data) {
            resolve(shared_getEta(data, company, opt));
        },
        error: function (err0, err1, err2) {
            reject();
        }
    });
};

var shared_isDatabaseUpdateNeeded = function (resolve, reject, versionStr) {
    $.ajax({
        url: "https://db.kmbeta.ml/ctbnwfb_db-version.json",
        cache: false,
        dataType: "json",
        success: function (data) {
            var lastUpdated;
            var version;
            try {
                lastUpdated = parseInt(data.version);
                version = parseInt(versionStr);
            } catch (err) {
                console.error("Error: Could not parse ctbnwfb_db last updated time or cached version! Forcing to be no update");
                resolve(false);
            }
            resolve(lastUpdated > version);
        },
        error: function (err) {
            console.error("Error: Could not check ctbnwfb_db update!");
            //reject(err);
            resolve(false);
        }
    });
};

var shared_fetchDatabase = function (resolve, reject, company) {
    $.ajax({
        url: "https://db.kmbeta.ml/ctbnwfb_db.json",
        cache: false,
        dataType: "json",
        success: function (data) {
            resolve(shared_processDb(data, company));
        },
        error: function (err, err1, err2) {
            reject();
        }
    });
};

var CtbProvider = function () {
    this.fetchDatabase = function (resolve, reject) {
        shared_fetchDatabase(resolve, reject, "CTB");
    }

    this.isDatabaseUpdateNeeded = function (resolve, reject, version) {
        shared_isDatabaseUpdateNeeded(resolve, reject, version);
    };

    this.fetchEta = function (resolve, reject, etaHandler) {
        shared_fetchEta(this, "CTB", resolve, reject, etaHandler);
    };
};

var NwfbProvider = function () {
    this.fetchDatabase = function (resolve, reject) {
        shared_fetchDatabase(resolve, reject, "NWFB");
    };

    this.isDatabaseUpdateNeeded = function (resolve, reject, version) {
        shared_isDatabaseUpdateNeeded(resolve, reject, version);
    };

    this.fetchEta = function (resolve, reject, etaHandler) {
        shared_fetchEta(this, "NWFB", resolve, reject, etaHandler);
    };
};