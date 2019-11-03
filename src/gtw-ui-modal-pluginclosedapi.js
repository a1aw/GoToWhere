import * as UI from './gtw-ui';

export function enable(node, func) {
    $("#plugin-closed-api-confirm-yes").on("click", function () {
        func();
        UI.hideModal();
    });
    $("#plugin-closed-api-confirm-no").on("click", function () {
        node.prop("checked", false);
        func();
        UI.hideModal();
    });
}

export function disable() {

}