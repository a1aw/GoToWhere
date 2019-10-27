//City Data: Transit (Misc functions)
const TransitType = {
    BUS: "bus",
    MINIBUS: "minibus",
    TRAM: "tram",
    TRAIN: "train",
    FERRY: "ferry"
};

define(function (require, exports, module) {
    var TransitRoutes = require("gtw-citydata-transit-routes");
    var TransitStops = require("gtw-citydata-transit-stops");
    var TransitEta = require("gtw-citydata-transit-eta");

    exports.getAllRoutes = function () {
        return TransitRoutes.getAllRoutes();
    };

    exports.getAllStops = function () {
        return TransitStops.getAllStops();
    };

    exports.fetchAllDatabase = function (pc) {
        var proms = [];
        var first = 0;
        var second = 0;
        var third = 0;
        proms.push(TransitRoutes.fetchAllDatabase(function (p) {
            first = p;
            pc((first + second + third) / 3);
        }));
        proms.push(TransitStops.fetchAllDatabase(function (p) {
            second = p;
            pc((first + second + third) / 3);
        }));
        proms.push(TransitEta.fetchAllDatabase(function (p) {
            third = p;
            pc((first + second + third) / 3);
        }));
        return Promise.all(proms);
    };

    exports.getStopIndex = function (route, stop, selectedPath) {
        if (selectedPath < 0 || selectedPath >= route.paths.length) {
            return -1;
        }
        var path = route.paths[selectedPath];
        for (var i = 0; i < path.length; i++) {
            var stopId = path[i];
            if (stop.stopId === stopId) {
                return i;
            }
        }
        return -1;
    };

    exports.searchRoutesOfStop = function (stop) {
        var out = [];

        var allRoutes = exports.getAllRoutes();
        for (var route of allRoutes) {
            var paths = route.paths;
            for (var i = 0; i < paths.length; i++) {
                var path = paths[i];
                for (var stopId of path) {
                    if (stop.stopId === stopId) {
                        out.push({
                            route: route,
                            bound: i
                        });
                    }
                }
            }
        }

        return out;
    };

    exports.getRoutesOfStop = function (stop) {
        var result = exports.searchRoutesOfStop(stop);

        return result.map(function (value, index) {
            return value[0];
        });
    };

});