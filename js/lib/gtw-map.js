//GTW Map source code

define(function (require, exports, module) {
    var config = require("gtw-config");

    exports.init = function () {
        return new Promise((resolve, reject) => {
            require(["gtw-map-" + config.mapApi], function (map) {
                exports.map = map;
                map.init().then(function () {
                    resolve();
                });
            });
        });
    };
});