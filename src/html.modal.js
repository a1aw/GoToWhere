function component() {
    const element = document.createElement("div");
    const dialog = document.createElement("div");
    const content = document.createElement("div");
    const header = document.createElement("div");
    const body = document.createElement("div");
    const footer = document.createElement("div");

    header.setAttribute("class", "modal-header");
    body.setAttribute("class", "modal-body");
    footer.setAttribute("class", "modal-footer");

    content.setAttribute("class", "modal-content");
    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);

    dialog.setAttribute("class", "modal-dialog");
    dialog.setAttribute("role", "document");
    dialog.appendChild(content);

    element.setAttribute("class", "modal fade");
    element.setAttribute("tabindex", "-1");
    element.setAttribute("role", "dialog");
    element.setAttribute("aria-labelledby", "modalLabel");
    element.setAttribute("aria-hidden", "true");
    element.appendChild(dialog);

    return element;
}

document.body.appendChild(component());