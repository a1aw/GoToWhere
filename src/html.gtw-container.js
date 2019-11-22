import nav from './html.gtw-container.nav';
import topPanel from './html.gtw-container.top-panel';
import splitMapPanel from './html.gtw-container.split-map-panel';
import gettingStartedPanel from './html.gtw-container.getting-started-panel';
import touchKeypad from './html.gtw-container.touch-keypad';

function component() {
    const element = document.createElement("div");
    const header = document.createElement("div");
    const contentPanelContainer = document.createElement("div");
    const splitMapContainerDesktop = document.createElement("div");

    contentPanelContainer.setAttribute("class", "container-fluid content-panel-container");

    splitMapContainerDesktop.setAttribute("class", "container-fluid split-map-container desktop");

    header.setAttribute("class", "header");
    header.appendChild(nav());
    header.appendChild(topPanel());
    header.appendChild(splitMapPanel());

    element.setAttribute("class", "gtw-container");
    element.appendChild(header);
    element.appendChild(gettingStartedPanel());
    element.appendChild(contentPanelContainer);
    element.appendChild(splitMapContainerDesktop);
    element.appendChild(touchKeypad());

    return element;
}

document.body.appendChild(component());