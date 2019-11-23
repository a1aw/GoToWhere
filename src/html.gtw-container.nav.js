export default function() {
    const nav = document.createElement("nav");

    const brand = document.createElement("a");
    brand.setAttribute("class", "navbar-brand");
    brand.innerHTML = "<i class=\"fas fa-map-marked-alt\"></i> <span data-i18n=\"app-name\"></span>";
    nav.appendChild(brand);

    const collapseBtn = document.createElement("button");
    collapseBtn.setAttribute("class", "navbar-toggler");
    collapseBtn.setAttribute("type", "button");
    collapseBtn.setAttribute("data-toggle", "collapse");
    collapseBtn.setAttribute("data-target", "#collapsibleNavbar");
    collapseBtn.innerHTML = "<span class=\"navbar-toggler-icon\"></span>";
    nav.appendChild(collapseBtn);

    const navCollapse = document.createElement("div");
    const navList = document.createElement("ul");

    navList.setAttribute("class", "navbar-nav");
    navList.appendChild(navListItem("plugins", "fas fa-plus-circle", "nav-plugins"));
    navList.appendChild(navListItem("settings", "fas fa-cog", "nav-settings"));
    navList.appendChild(navListItem("github", "fab fa-github", "nav-github"));
    navList.appendChild(navListItem("feedback", "fas fa-exclamation-triangle", "nav-feedback"));
    navList.appendChild(navListItem("about", "fas fa-info-circle", "nav-about"));

    navCollapse.setAttribute("class", "collapse navbar-collapse");
    navCollapse.setAttribute("id", "collapsibleNavbar");
    navCollapse.appendChild(navList);

    var darkMode = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

    nav.setAttribute("class", "navbar navbar-" + (darkMode ? "dark" : "light"));
    nav.appendChild(navCollapse);

    return nav;
}

function navListItem(linkName, iconCss, msgKey) {
    const listItem = document.createElement("li");
    const btn = document.createElement("button");

    btn.setAttribute("class", "btn btn-link nav-link header-links-" + linkName);
    btn.setAttribute("data-toggle", "collapse");
    btn.setAttribute("data-target", ".navbar-collapse.show");
    btn.innerHTML = "<i class=\"" + iconCss + "\"></i> <span data-i18n=\"" + msgKey + "\"></span>";
    listItem.setAttribute("class", "nav-item");
    listItem.appendChild(btn);

    return listItem;
}