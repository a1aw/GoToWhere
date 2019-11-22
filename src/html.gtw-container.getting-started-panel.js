export default function () {
    const container = document.createElement("div");
    const appTitle = document.createElement("p");
    const wizard = document.createElement("div");
    const wizardSteps = document.createElement("ul");
    const wizardStepContents = document.createElement("div");

    appTitle.setAttribute("class", "app-title");
    appTitle.innerHTML = "<i class=\"fas fa-map-marked-alt\"></i> <span data-i18n=\"app-name\"></span> <span class=\"lead\" data-i18n=\"app-desc\"></span>";

    wizardSteps.appendChild(wizardStep("#step-1", "getting-started-wizard-step-language"));
    wizardSteps.appendChild(wizardStep("#step-2", "getting-started-wizard-step-plugins"));
    wizardSteps.appendChild(wizardStep("#step-3", "getting-started-wizard-step-finish"));

    wizardStepContents.appendChild(step1());
    wizardStepContents.appendChild(step2());
    wizardStepContents.appendChild(step3());

    wizard.setAttribute("id", "gettingStartedWizard");
    wizard.appendChild(wizardSteps);
    wizard.appendChild(wizardStepContents);

    container.setAttribute("class", "container-fluid getting-started-panel");
    container.appendChild(appTitle);
    container.appendChild(wizard);
    container.appendChild(progressPanel());
    container.appendChild(errorPanel());

    return container;
}

function step1() {
    const container = document.createElement("div");
    const p1 = document.createElement("p");
    const p2 = document.createElement("p");
    const p3 = document.createElement("p");
    const inputGroup = document.createElement("div");
    const inputGroupPrepend = document.createElement("div");
    const label = document.createElement("label");
    const select = document.createElement("select");
    const link = document.createElement("a");

    p1.setAttribute("class", "display-4");
    p1.setAttribute("data-i18n", "getting-started-wizard-step-language-welcome");

    p2.setAttribute("class", "lead");
    p2.setAttribute("data-i18n", "getting-started-wizard-step-language-desc");

    p3.setAttribute("class", "display-5");
    p3.setAttribute("data-i18n", "getting-started-wizard-step-language-choose-language");

    label.setAttribute("class", "input-group-text");
    label.setAttribute("for", "langSelect");
    label.setAttribute("data-i18n", "getting-started-wizard-step-language-input-language");

    inputGroupPrepend.setAttribute("class", "input-group-prepend");
    inputGroupPrepend.appendChild(label);

    select.setAttribute("class", "custom-select");
    select.setAttribute("id", "langSelect");

    inputGroup.setAttribute("class", "input-group mb-3");
    inputGroup.appendChild(inputGroupPrepend);
    inputGroup.appendChild(select);

    link.setAttribute("href", "https://github.com/mob41/GoToWhere");
    link.setAttribute("target", "_blank");
    link.setAttribute("data-i18n", "getting-started-wizard-step-language-help-translate");

    container.setAttribute("id", "step-1");
    container.appendChild(p1);
    container.appendChild(p2);
    container.appendChild(p3);
    container.appendChild(inputGroup);
    container.appendChild(link);

    return container;
}

function step2() {
    const container = document.createElement("div");
    const p1 = document.createElement("p");
    const inputGroup = document.createElement("div");
    const inputGroupPrepend = document.createElement("div");
    const label = document.createElement("label");
    const select = document.createElement("select");
    const optionLoading = document.createElement("option");
    const p2 = document.createElement("p");
    const accord = document.createElement("div");

    p1.setAttribute("class", "display-5");
    p1.setAttribute("data-i18n", "getting-started-wizard-step-plugins-select-region");

    label.setAttribute("class", "input-group-text");
    label.setAttribute("for", "regionSelect");
    label.setAttribute("data-i18n", "getting-started-wizard-step-plugins-input-region");

    inputGroupPrepend.setAttribute("class", "input-group-prepend");
    inputGroupPrepend.appendChild(label);

    optionLoading.setAttribute("data-i18n", "getting-started-wizard-step-plugins-loading");

    select.setAttribute("class", "custom-select");
    select.setAttribute("id", "regionSelect");
    select.setAttribute("disabled", "disabled");
    select.appendChild(optionLoading);

    inputGroup.setAttribute("class", "input-group mb-3");
    inputGroup.appendChild(inputGroupPrepend);
    inputGroup.appendChild(select);

    p2.setAttribute("id", "pluginsToInstallCount");

    accord.setAttribute("class", "accordion");
    accord.setAttribute("id", "pluginsToInstallAccordion");

    container.setAttribute("id", "step-2");
    container.appendChild(p1);
    container.appendChild(inputGroup);
    container.appendChild(p2);
    container.appendChild(accord);

    return container;
}

function step3() {
    const container = document.createElement("div");
    const p1 = document.createElement("p");
    const p2 = document.createElement("p");
    const p3 = document.createElement("p");
    const p4 = document.createElement("p");
    const btn = document.createElement("button");

    p1.setAttribute("class", "display-4");
    p1.setAttribute("data-i18n", "getting-started-wizard-step-finish-finish-text");

    p2.setAttribute("class", "lead");
    p2.setAttribute("data-i18n", "getting-started-wizard-step-finish-desc");

    p3.setAttribute("class", "display-5");
    p3.setAttribute("id", "installCount");

    p4.setAttribute("class", "need-to-install");
    p4.setAttribute("data-i18n", "[html]getting-started-wizard-step-finish-must-install");

    btn.setAttribute("class", "btn btn-block btn-success disabled");
    btn.setAttribute("type", "button");
    btn.setAttribute("id", "getStartedBtn");
    btn.setAttribute("data-i18n", "getting-started-wizard-step-finish-get-started-btn");

    container.setAttribute("id", "step-3");
    container.appendChild(p1);
    container.appendChild(p2);
    container.appendChild(p3);
    container.appendChild(p4);
    container.appendChild(btn);

    return container;
}

function progressPanel() {
    const panel = document.createElement("div");
    const p1 = document.createElement("p");
    const p2 = document.createElement("p");
    const progressPanel = document.createElement("div");
    const status = document.createElement("small");
    const progress = document.createElement("div");
    const progressBar = document.createElement("div");

    p1.setAttribute("class", "display-4");
    p1.setAttribute("data-i18n", "getting-started-please-wait");

    p2.setAttribute("class", "lead");
    p2.setAttribute("data-i18n", "getting-started-please-wait-desc");

    status.setAttribute("data-i18n", "getting-started-installing-plugins");

    progressBar.setAttribute("class", "progress-bar progress-bar-striped progress-bar-animated");
    progressBar.setAttribute("role", "progressbar");
    progressBar.setAttribute("id", "gs-plugin-progress");
    progressBar.setAttribute("style", "width: 0%");

    progress.setAttribute("class", "progress");
    progress.appendChild(progressBar);

    progressPanel.setAttribute("class", "progress-panel");
    progressPanel.appendChild(status);
    progressPanel.appendChild(progress);

    panel.setAttribute("class", "getting-started-progress-panel");
    panel.appendChild(p1);
    panel.appendChild(p2);
    panel.appendChild(progressPanel);

    return panel;
}

function errorPanel() {
    const panel = document.createElement("div");
    const p1 = document.createElement("p");
    const p2 = document.createElement("p");

    p1.setAttribute("class", "display-4");
    p1.setAttribute("data-i18n", "getting-started-error");

    p2.setAttribute("class", "desc");
    
    panel.setAttribute("class", "getting-started-plugin-error-panel");
    panel.appendChild(p1);
    panel.appendChild(p2);

    return panel;
}

function wizardStep(stepLink, msgKey) {
    const listItem = document.createElement("li");
    const link = document.createElement("a");
    link.setAttribute("href", stepLink);
    link.setAttribute("data-i18n", msgKey);
    listItem.appendChild(link);
    return listItem;
}