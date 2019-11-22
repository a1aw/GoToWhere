function component() {
    const element = document.createElement("div");

    element.setAttribute("class", "map-overlay");

    return element;
}

document.body.appendChild(component());