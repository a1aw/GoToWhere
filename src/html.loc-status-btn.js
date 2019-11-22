function component() {
    const element = document.createElement("button");
    const icon = document.createElement("i");

    element.setAttribute("class", "btn btn-warning");
    element.setAttribute("type", "button");
    element.setAttribute("id", "loc-status-btn");

    icon.setAttribute("class", "fas fa-location-arrow");

    element.appendChild(icon);

    return element;
}

document.body.appendChild(component());