const whenDefinedWithTimeout = (name: string, timeout = 500): Promise<any> =>
  Promise.race([customElements.whenDefined(name), new Promise<void>((resolve) => setTimeout(resolve, timeout))]);

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

  const promises: Promise<any>[] = [];

  if (!customElements.get("ha-yaml-editor")) {
    promises.push(whenDefinedWithTimeout("ha-yaml-editor"));
  }

  const hasDropdown = customElements.get("ha-dropdown") !== undefined;
  const hasButtonMenu = customElements.get("ha-button-menu") !== undefined;

  if (!hasDropdown && !hasButtonMenu) {
    promises.push(whenDefinedWithTimeout("ha-dropdown"));
    promises.push(whenDefinedWithTimeout("ha-button-menu"));
  }

  if (!customElements.get("ha-button")) {
    promises.push(whenDefinedWithTimeout("ha-button"));
  }

  await Promise.all(promises);
};

export const loadCustomElement = async <T = any>(name: string) => {
  const component = customElements.get(name) as T;
  if (component) {
    return component;
  }
  await whenDefinedWithTimeout(name);
  return customElements.get(name) as T;
};

// Loads in ha-config-dashboard which is used to copy styling
// Also provides ha-settings-row
export const loadConfigDashboard = async () => {
  if (customElements.get("ha-config-dashboard")) {
    return;
  }
  if (!customElements.get("partial-panel-resolver")) {
    await whenDefinedWithTimeout("partial-panel-resolver", 250);
  }
  if (!customElements.get("partial-panel-resolver")) {
    return;
  }

  const ppResolver = document.createElement("partial-panel-resolver");
  const routes = (ppResolver as any)._getRoutes([
    {
      component_name: "config",
      url_path: "a",
    },
  ]);
  await routes?.routes?.a?.load?.();
  await whenDefinedWithTimeout("ha-panel-config", 250);
  const configRouter: any = document.createElement("ha-panel-config");
  await configRouter?.routerOptions?.routes?.dashboard?.load?.(); // Load ha-config-dashboard
  await configRouter?.routerOptions?.routes?.general?.load?.(); // Load ha-settings-row
  await configRouter?.routerOptions?.routes?.entities?.load?.(); // Load ha-data-table
  await configRouter?.routerOptions?.routes?.script?.load?.(); // Load ha-script-fields
  await whenDefinedWithTimeout("ha-config-dashboard", 250);
  await whenDefinedWithTimeout("ha-config-script", 250);
  await whenDefinedWithTimeout("ha-", 250);
};

export const loadDeveloperToolsTemplate = async () => {
  if (customElements.get("developer-tools-template")) {
    return;
  }
  if (!customElements.get("partial-panel-resolver")) {
    await whenDefinedWithTimeout("partial-panel-resolver", 250);
  }
  if (!customElements.get("partial-panel-resolver")) {
    return;
  }

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
  await whenDefinedWithTimeout("developer-tools-template", 250);
  await whenDefinedWithTimeout("ha-yaml-editor", 250);
};
