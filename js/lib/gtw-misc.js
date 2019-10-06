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

    exports.similarity = function (s1, s2) {
        var longer = s1;
        var shorter = s2;
        if (s1.length < s2.length) {
            longer = s2;
            shorter = s1;
        }
        var longerLength = longer.length;
        if (longerLength == 0) {
            return 1.0;
        }
        return (longerLength - exports.editDistance(longer, shorter)) / parseFloat(longerLength);
    };

    exports.editDistance = function(s1, s2) {
        s1 = s1.toLowerCase();
        s2 = s2.toLowerCase();

        var costs = new Array();
        for (var i = 0; i <= s1.length; i++) {
            var lastValue = i;
            for (var j = 0; j <= s2.length; j++) {
                if (i == 0)
                    costs[j] = j;
                else {
                    if (j > 0) {
                        var newValue = costs[j - 1];
                        if (s1.charAt(i - 1) != s2.charAt(j - 1))
                            newValue = Math.min(Math.min(newValue, lastValue),
                                costs[j]) + 1;
                        costs[j - 1] = lastValue;
                        lastValue = newValue;
                    }
                }
            }
            if (i > 0)
                costs[s2.length] = lastValue;
        }
        return costs[s2.length];
    };
});