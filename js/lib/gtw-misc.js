//OpenETA Misc

define(function (require, exports, module) {
    exports.geoDistance = function (lat1, lon1, lat2, lon2) {
        var p = 0.017453292519943295;    // Math.PI / 180
        var c = Math.cos;
        var a = 0.5 - c((lat2 - lat1) * p) / 2 +
            c(lat1 * p) * c(lat2 * p) *
            (1 - c((lon2 - lon1) * p)) / 2;

        return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
    }

    exports.allProgress = function (proms, progress_cb) {
        let d = 0;
        progress_cb(0);
        for (const p of proms) {
            p.then(() => {
                d++;
                progress_cb((d * 100) / proms.length);
            });
        }
        return Promise.all(proms);
    }

    exports.isSamePropertyValueInArray = function (array, name, value) {
        for (var object of array) {
            if (object[name] === value) {
                return true;
            }
        }
        return false;
    }

    exports.fillZero = function (number) {
        return number < 10 ? ("0" + number) : number;
    }
});