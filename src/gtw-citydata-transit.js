//City Data: Transit (Misc functions)
import * as TransitRoutes from './gtw-citydata-transit-routes';
import * as TransitStops from './gtw-citydata-transit-stops';
import * as TransitEta from './gtw-citydata-transit-eta';

window.TransitType = {
    BUS: "bus",
    MINIBUS: "minibus",
    TRAM: "tram",
    TRAIN: "train",
    FERRY: "ferry"
};

export function getAllRoutes() {
    return TransitRoutes.getAllRoutes();
}

export function getAllStops() {
    return TransitStops.getAllStops();
}

export function fetchAllDatabase (pc) {
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
}

export function getStopIndex(route, stop, selectedPath) {
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
}

export function searchRoutesOfStop(stop) {
    var out = [];

    var allRoutes = getAllRoutes();
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
}

export function getRoutesOfStop(stop) {
    var result = searchRoutesOfStop(stop);

    return result.map(function (value, index) {
        return value[0];
    });
}