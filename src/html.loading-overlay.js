function component() {
    const element = document.createElement("div");
    const loadingSpinner = document.createElement("div");
    const spinner = document.createElement("div");
    const spinnerSr = document.createElement("span");

    spinnerSr.setAttribute("class", "sr-only");
    spinnerSr.innerHTML = "Loading...";

    spinner.setAttribute("class", "spinner-border m-5");
    spinner.setAttribute("role", "status");
    spinner.appendChild(spinnerSr);

    loadingSpinner.setAttribute("class", "loading-spinner d-flex align-items-center justify-content-center");
    loadingSpinner.appendChild(spinner);

    element.setAttribute("class", "loading-overlay");
    element.appendChild(loadingSpinner);

    return element;
}

document.body.appendChild(component());