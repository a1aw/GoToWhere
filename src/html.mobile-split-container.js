function component() {
    const element = document.createElement("div");
    const splitMapPanel = document.createElement("div");
    const container = document.createElement("div");
    const backBtn = document.createElement("button");
    const upBtn = document.createElement("button");
    const downBtn = document.createElement("button");
    const tabPanel = document.createElement("div");
    const splitMapContainer = document.createElement("div");

    backBtn.setAttribute("type", "button");
    backBtn.setAttribute("class", "btn btn-link ui-split-map-back-btn");
    backBtn.innerHTML = "<i class=\"fas fa-arrow-left\"></i> <span data-i18n=\"split-panel-back\"></span>";

    upBtn.setAttribute("type", "button");
    upBtn.setAttribute("class", "btn btn-link ui-pull-up-btn");
    upBtn.innerHTML = "<i class=\"fas fa-arrow-up\"></i> <span data-i18n=\"split-panel-move-up\"></span>";

    downBtn.setAttribute("type", "button");
    downBtn.setAttribute("class", "btn btn-link ui-pull-down-btn");
    downBtn.innerHTML = "<i class=\"fas fa-arrow-down\"></i> <span data-i18n=\"split-panel-move-down\"></span>";

    tabPanel.setAttribute("class", "split-map-tab-panel");

    container.setAttribute("class", "container-fluid");
    container.appendChild(backBtn);
    container.appendChild(upBtn);
    container.appendChild(downBtn);
    container.appendChild(tabPanel);

    splitMapPanel.setAttribute("class", "jumbotron jumbotron-fluid split-map-panel mobile")
    splitMapPanel.appendChild(container);

    splitMapContainer.setAttribute("class", "container-fluid split-map-container mobile");

    element.setAttribute("class", "container-fluid mobile-split-container");
    element.appendChild(splitMapPanel);
    element.appendChild(splitMapContainer);

    return element;
}

document.body.appendChild(component());