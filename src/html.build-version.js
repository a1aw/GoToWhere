function component() {
    const element = document.createElement("span");

    element.setAttribute("class", "build-version");
    element.innerHTML = VERSION;

    return element;
}

document.body.appendChild(component());