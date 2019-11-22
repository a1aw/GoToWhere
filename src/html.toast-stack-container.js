function component() {
    const element = document.createElement("div");
    const stack = document.createElement("div");

    stack.setAttribute("id", "gtw-toast-stack");

    element.setAttribute("class", "toast-stack-container");
    element.setAttribute("aria-live", "polite");
    element.setAttribute("aria-atomic", "true");
    element.appendChild(stack);

    return element;
}

document.body.appendChild(component());