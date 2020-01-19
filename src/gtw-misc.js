//GTW Misc

export function geoDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) {
        return -1;
    }
    var p = 0.017453292519943295;    // Math.PI / 180
    var c = Math.cos;
    var a = 0.5 - c((lat2 - lat1) * p) / 2 +
        c(lat1 * p) * c(lat2 * p) *
        (1 - c((lon2 - lon1) * p)) / 2;

    return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
}

export function stringCompare(a, b) {
    if (typeof a !== "string" || typeof b !== "string") {
        return false;
    }
    if (a.length < b.length) {
        return -1;
    } else if (a.length > b.length) {
        return 1;
    }
    var i;
    var ca;
    var cb;
    var len = a.length;
    for (i = 0; i < len; i++) {
        ca = a.charAt(i);
        cb = b.charAt(i);
        if (ca < cb) {
            return -1;
        } else if (ca > cb) {
            return 1;
        }
    }
    return 0;
}

export function allProgress(proms, progress_cb) {
    if (!proms.length || typeof progress_cb !== "function") {
        return false;
    }
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

export function isSamePropertyValueInArray(array, name, value) {
    for (var object of array) {
        if (object[name] === value) {
            return true;
        }
    }
    return false;
}

export function fillZero(number) {
	if (number >= 60 || number < 0){
		return -1;
	}
    return number < 10 ? ("0" + number) : number;
}

export function similarity(s1, s2) {
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
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

export function editDistance(s1, s2) {
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
}