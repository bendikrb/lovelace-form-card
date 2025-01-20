// Hack to load ha-components needed for editor
export const loadHaComponents = async () => {
  if (!customElements.get("ha-form")) {
    (customElements.get("hui-button-card") as any)?.getConfigElement();
  }
  if (!customElements.get("ha-entity-picker")) {
    (customElements.get("hui-entities-card") as any)?.getConfigElement();
  }
  if (!customElements.get("ha-card-conditions-editor")) {
    (customElements.get("hui-conditional-card") as any)?.getConfigElement();
  }
  if (!customElements.get("ha-yaml-editor")) {
    await customElements.whenDefined("ha-yaml-editor");
  }
  if (!customElements.get("ha-button-menu")) {
    await customElements.whenDefined("ha-button-menu");
    await customElements.whenDefined("ha-button");
  }
};

export const loadCustomElement = async <T = any>(name: string) => {
  const component = customElements.get(name) as T;
  if (component) {
    return component;
  }
  await customElements.whenDefined(name);
  return customElements.get(name) as T;
};

// Loads in ha-config-dashboard which is used to copy styling
// Also provides ha-settings-row
export const loadConfigDashboard = async () => {
  await customElements.whenDefined("partial-panel-resolver");
  const ppResolver = document.createElement("partial-panel-resolver");
  const routes = (ppResolver as any)._getRoutes([
    {
      component_name: "config",
      url_path: "a",
    },
  ]);
  await routes?.routes?.a?.load?.();
  await customElements.whenDefined("ha-panel-config");
  const configRouter: any = document.createElement("ha-panel-config");
  await configRouter?.routerOptions?.routes?.dashboard?.load?.(); // Load ha-config-dashboard
  await configRouter?.routerOptions?.routes?.general?.load?.(); // Load ha-settings-row
  await configRouter?.routerOptions?.routes?.entities?.load?.(); // Load ha-data-table
  await configRouter?.routerOptions?.routes?.script?.load?.(); // Load ha-script-fields
  await customElements.whenDefined("ha-config-dashboard");
  await customElements.whenDefined("ha-config-script");
};

export const loadDeveloperToolsTemplate = async () => {
  await customElements.whenDefined("partial-panel-resolver");
  await customElements.whenDefined("partial-panel-resolver");
  const ppResolver = document.createElement("partial-panel-resolver");
  const routes = (ppResolver as any)._getRoutes([
    {
      component_name: "developer-tools",
      url_path: "a",
    },
  ]);
  await routes?.routes?.a?.load?.();
  const dtRouter: any = document.createElement("developer-tools-router");
  await dtRouter?.routerOptions?.routes?.template?.load?.();
  await customElements.whenDefined("developer-tools-template");
};
