export default function() {
    const container = document.createElement("div");
    const numericKeypad = document.createElement("div");
    const letterKeypad = document.createElement("div");

    numericKeypad.setAttribute("class", "numeric-keypad btn-group-vertical");
    numericKeypad.setAttribute("role", "group");

    numericKeypad.appendChild(chain([
        ["value", "btn-outline-secondary", "1"],
        ["value", "btn-outline-secondary", "2"],
        ["value", "btn-outline-secondary", "3"]
    ]));

    numericKeypad.appendChild(chain([
        ["value", "btn-outline-secondary", "4"],
        ["value", "btn-outline-secondary", "5"],
        ["value", "btn-outline-secondary", "6"]
    ]));

    numericKeypad.appendChild(chain([
        ["value", "btn-outline-secondary", "7"],
        ["value", "btn-outline-secondary", "8"],
        ["value", "btn-outline-secondary", "9"]
    ]));

    numericKeypad.appendChild(chain([
        ["function", "btn-primary touch-keypad-function-done", "<i class=\"fas fa-check\"></i>"],
        ["value", "btn-outline-secondary", "0"],
        ["function", "btn-warning touch-keypad-function-backspace", "<i class=\"fas fa-backspace\"></i>"]
    ]));

    letterKeypad.setAttribute("class", "letter-keypad btn-group-vertical");
    letterKeypad.setAttribute("role", "group");

    container.setAttribute("class", "container-fluid touch-keypad row");
    container.appendChild(numericKeypad);
    container.appendChild(letterKeypad);

    return container;
}

function chain(opts) {
    const btnGroup = document.createElement("div");

    btnGroup.setAttribute("class", "btn-group");
    var i;
    for (i = 0; i < opts.length; i++) {
        btnGroup.appendChild(key(opts[i][0], opts[i][1], opts[i][2]));
    }

    return btnGroup;
}

function key(suffix, css, value) {
    const btn = document.createElement("button");
    btn.setAttribute("type", "button");
    btn.setAttribute("class", "btn " + css + " py-3 touch-keypad-key touch-keypad-" + suffix + " disabled");
    btn.innerHTML = value;
    return btn;
}