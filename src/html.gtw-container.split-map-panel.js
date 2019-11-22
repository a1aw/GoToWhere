export default function() {
    const jumbo = document.createElement("div");
    const container = document.createElement("div");
    const btn = document.createElement("button");
    const splitMapTabPanel = document.createElement("div");

    btn.setAttribute("type", "button");
    btn.setAttribute("class", "btn btn-link ui-split-map-back-btn");
    btn.innerHTML = "<i class=\"fas fa-arrow-left\"></i> <span data-i18n=\"split-panel-back\"></span>";

    splitMapTabPanel.setAttribute("class", "split-map-tab-panel");

    container.setAttribute("class", "container-fluid");
    container.appendChild(btn);
    container.appendChild(splitMapTabPanel);
    jumbo.appendChild(container);

    jumbo.setAttribute("class", "jumbotron jumbotron-fluid split-map-panel desktop");

    return jumbo;
}