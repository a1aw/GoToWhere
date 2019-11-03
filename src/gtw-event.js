//GTW Event Manager

export const EVENTS = {
    EVENT_UI_BACK: "EVENT_UI_BACK",
    EVENT_LOCATION_CHANGE: "EVENT_LOCATION_CHANGE"
};

var eventListeners = {};

export function dispatchEvent(event, ...args) {
    if (!eventListeners[event]) {
        return;
    }
    for (var listener of eventListeners[event]) {
        if (listener) {
            listener.apply(args);
        } else {
            removeListener(listener);
        }
    }
}

export function addListener(event, listener) {
    if (!eventListeners[event]) {
        eventListeners[event] = [];
    }
    eventListeners[event].push(listener);
}

export function removeListener(event, listener) {
    if (!eventListeners[event]) {
        return;
    }
    var i = eventListeners[event].indexOf(listener);
    if (i === -1) {
        return;
    }
    eventListeners[event].splice(i, 1);
}

export function removeAllListeners() {
    eventListeners = {};
}