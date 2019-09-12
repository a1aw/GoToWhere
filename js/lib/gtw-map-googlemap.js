//GTW Map source code

define(function (require, exports, module) {
    exports.init = function () {
        map = new google.maps.Map(document.getElementById('map'), {
            center: { lat: 22.25, lng: 114.1667 },
            zoom: 12
        });
    }
});