function component() {
    const element = document.createElement("div");
    const p = document.createElement("p");

    p.setAttribute("class", "text-center");
    p.setAttribute("data-i18n", "app-license-message");

    element.setAttribute("class", "jumbotron text-center footer");
    element.setAttribute("style", "margin-bottom: 0");
    element.appendChild(p);

    return element;
}

document.body.appendChild(component());