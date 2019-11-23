export default function () {
    const jumbo = document.createElement("div");
    const container = document.createElement("div");
    const btnGroup = document.createElement("div");
    const tabPanel = document.createElement("div");

    btnGroup.setAttribute("class", "tabs btn-group");
    btnGroup.appendChild(tabButton("transit", "fas fa-bus", "home-tab-transit", true));
    btnGroup.appendChild(tabButton("navigation", "fas fa-location-arrow", "home-tab-navigation"));
    container.appendChild(btnGroup);

    tabPanel.setAttribute("class", "tab-panel");
    container.appendChild(tabPanel);

    container.setAttribute("class", "container-fluid");
    jumbo.appendChild(container);

    jumbo.setAttribute("class", "jumbotron jumbotron-fluid top-panel");

    return jumbo;
}

function tabButton(tab, iconCss, msgKey, primary = false, disabled = false) {
    const btn = document.createElement("button");
    btn.setAttribute("class", "btn " + (primary ? "btn-primary" : "btn-link") + " ui-tab");
    btn.setAttribute("type", "button");
    if (disabled) {
        btn.setAttribute("disabled", "disabled");
    }
    btn.setAttribute("data-gtw-tab", tab);
    btn.innerHTML = "<i class=\"" + iconCss + "\"></i> <span data-i18n=\"" + msgKey + "\"></span>";
    return btn;
}