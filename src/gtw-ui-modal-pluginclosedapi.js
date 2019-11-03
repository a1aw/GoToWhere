export function enable(node, func) {
    $("#plugin-closed-api-confirm-yes").on("click", function () {
        func();
        hideModal();
    });
    $("#plugin-closed-api-confirm-no").on("click", function () {
        node.prop("checked", false);
        func();
        hideModal();
    });
}

export function disable() {

}