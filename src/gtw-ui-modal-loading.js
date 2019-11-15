export function enable(title, status, footer) {
    $(".modal-title").html(title);
    $("#loading-status").html(status);
    $("#loading-footer").html(footer);
}

export function disable() {

}