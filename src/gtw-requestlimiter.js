//GTW Request Limiter

export var requests = [];

export var duration = 500;

export var running = false;

export function queue(func, args) {
    if (typeof func !== "function") {
        throw new TypeError("The variable must be a 'function'.");
    }
    requests.push([func, args]);
    return func;
}

export function stack(func, args) {
    if (typeof func !== "function") {
        throw new TypeError("The variable must be a 'function'.");
    }
    requests.unshift([func, args]);
    return func;
}

export function start() {
    if (running) {
        return;
    }

    running = true;
    dispatch();
}

export function dispatch() {
    var next = requests.shift();
    var global = this;

    if (next && typeof next[0] === 'function') {
        next[0].apply(null, next[1]);
    }

    if (running) {
        setTimeout(function () {
            dispatch();
        }, duration);
    }
}

export function stop() {
    running = false;
}

export function clear() {
    requests = [];
}