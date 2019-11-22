export default function() {
    const container = document.createElement("div");
    const numericKeypad = document.createElement("div");
    const letterKeypad = document.createElement("div");

    numericKeypad.appendChild(chain(["value", "value", "value"], ["1", "2", "3"]));
    numericKeypad.appendChild(chain(["value", "value", "value"], ["4", "5", "6"]));
    numericKeypad.appendChild(chain(["value", "value", "value"], ["7", "8", "9"]));
    numericKeypad.appendChild(chain([
        "function touch-keypad-function-done",
        "value",
        "function touch-keypad-function-backspace"
    ], [
        "<i class=\"fas fa-check\"></i>",
        "0",
        "<i class=\"fas fa-backspace\"></i>"
        ]));

    letterKeypad.setAttribute("class", "letter-keypad btn-group-vertical");
    letterKeypad.setAttribute("role", "group");

    container.setAttribute("class", "container-fluid touch-keypad row");
    container.appendChild(numericKeypad);
    container.appendChild(letterKeypad);

    return container;
}

function chain(suffixes, values) {
    const btnGroup = document.createElement("div");

    btnGroup.setAttribute("class", "btn-group");
    var i;
    for (i = 0; i < suffixes.length; i++) {
        btnGroup.appendChild(key(suffixes[i], values[i]));
    }

    return btnGroup;
}

function key(suffix, value) {
    const btn = document.createElement("button");
    btn.setAttribute("type", "button");
    btn.setAttribute("class", "btn btn-outline-secondary py-3 touch-keypad-key touch-keypad-" + suffix + " disabled");
    btn.innerHTML = value;
    return btn;
}