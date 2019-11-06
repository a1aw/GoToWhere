var onClickListeners = [];

$(".touch-keypad-function-done").on("click", mouseClickTouchKeypadValue);
$(".touch-keypad-function-backspace").on("click", mouseClickTouchKeypadValue);
$(".touch-keypad-value").on("click", mouseClickTouchKeypadValue);

function mouseClickTouchKeypadValue() {
    $(this).blur();
    if ($(this).hasClass("disabled")) {
        return;
    }
    for (var listener of onClickListeners) {
        listener(this);
    }
}

export function reset() {
    $(".numeric-keypad .touch-keypad-value").each(function () {
        $(this).removeClass("disabled");
        $(this).removeClass("btn-secondary");
        $(this).addClass("btn-outline-secondary");
    });
}

export function showTouchKeypad() {
    $(".touch-keypad").css("display", "flex");
    adjustMargin();
}

export function hideTouchKeypad() {
    $(".touch-keypad").css("display", "");
    adjustMargin();
}

export function addListener(listener) {
    if (typeof listener !== "function") {
        return false;
    }
    onClickListeners.push(listener);
    return true;
}

export function removeListener(listener) {
    if (typeof listener !== "function") {
        return false;
    }
    var index = onClickListeners.indexOf(listener);
    if (index !== -1) {
        onClickListeners.splice(index, 1);
        return true;
    }
    return false;
}

export function setEnabled(keyMap) {
    $(".numeric-keypad .touch-keypad-value").each(function () {
        var val = $(this).html();
        if (!keyMap[val]) {
            $(this).addClass("disabled");
            $(this).addClass("btn-secondary");
            $(this).removeClass("btn-outline-secondary");
        } else {
            $(this).removeClass("disabled");
            $(this).removeClass("btn-secondary");
            $(this).addClass("btn-outline-secondary");
        }
        delete keyMap[val];
    });

    var keys = Object.keys(keyMap);
    keys.sort(function (a, b) {
        return a.charCodeAt(0) - b.charCodeAt(0);
    });

    var letterKeypadHtml = "";
    for (var key of keys) {
        letterKeypadHtml += "<button type=\"button\" class=\"btn btn-outline-secondary py-3 touch-keypad-key touch-keypad-value\">" + key + "</button>";
    }
    $(".letter-keypad").html(letterKeypadHtml);

    $(".letter-keypad .touch-keypad-value").on("click", mouseClickTouchKeypadValue);
}