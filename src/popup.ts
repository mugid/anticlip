(() => {
  type AntiClipConfig = {
    enabled: boolean;
    multiplier: number;
    hideRecommendations: boolean;
    hideComments: boolean;
    hideShorts: boolean;
    disableAutoplay: boolean;
  };

  const DEFAULT_CONFIG: AntiClipConfig = {
    enabled: true,
    multiplier: 0.5,
    hideRecommendations: true,
    hideComments: true,
    hideShorts: true,
    disableAutoplay: true
  };

  const STORAGE_KEY = "anticlip-config";

  const toggle = document.querySelector<HTMLButtonElement>("[data-toggle]");
  const multiplierButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-multiplier]")];
  const featureButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-feature]")];
  const actualRate = document.querySelector<HTMLElement>("[data-actual-rate]");
  const status = document.querySelector<HTMLElement>("[data-status]");

  let config: AntiClipConfig = { ...DEFAULT_CONFIG };

  function isConfigShape(value: unknown): value is Partial<AntiClipConfig> {
    return typeof value === "object" && value !== null;
  }

  function normalizeConfig(value: unknown): AntiClipConfig {
    const partialConfig = isConfigShape(value) ? value : undefined;

    return {
      enabled:
        typeof partialConfig?.enabled === "boolean"
          ? partialConfig.enabled
          : DEFAULT_CONFIG.enabled,
      multiplier:
        typeof partialConfig?.multiplier === "number" &&
        Number.isFinite(partialConfig.multiplier)
          ? partialConfig.multiplier
          : DEFAULT_CONFIG.multiplier,
      hideRecommendations:
        typeof partialConfig?.hideRecommendations === "boolean"
          ? partialConfig.hideRecommendations
          : DEFAULT_CONFIG.hideRecommendations,
      hideComments:
        typeof partialConfig?.hideComments === "boolean"
          ? partialConfig.hideComments
          : DEFAULT_CONFIG.hideComments,
      hideShorts:
        typeof partialConfig?.hideShorts === "boolean"
          ? partialConfig.hideShorts
          : DEFAULT_CONFIG.hideShorts,
      disableAutoplay:
        typeof partialConfig?.disableAutoplay === "boolean"
          ? partialConfig.disableAutoplay
          : DEFAULT_CONFIG.disableAutoplay
    };
  }

  function saveConfig(nextConfig: AntiClipConfig) {
    config = nextConfig;
    chrome.storage.sync.set({ [STORAGE_KEY]: config }, render);
  }

  function render() {
    document.documentElement.dataset.enabled = String(config.enabled);

    if (toggle) {
      toggle.setAttribute("aria-pressed", String(config.enabled));
      toggle.textContent = config.enabled ? "On" : "Off";
    }

    if (status) {
      status.textContent = config.enabled ? "Active on YouTube" : "Paused";
    }

    if (actualRate) {
      actualRate.textContent = `${config.multiplier}x`;
    }

    multiplierButtons.forEach((button) => {
      const isSelected = Number(button.dataset.multiplier) === config.multiplier;
      button.setAttribute("aria-pressed", String(isSelected));
    });

    featureButtons.forEach((button) => {
      const feature = button.dataset.feature as keyof AntiClipConfig | undefined;

      if (!feature || typeof config[feature] !== "boolean") {
        return;
      }

      button.setAttribute("aria-pressed", String(config[feature]));
    });
  }

  toggle?.addEventListener("click", () => {
    saveConfig({ ...config, enabled: !config.enabled });
  });

  multiplierButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const multiplier = Number(button.dataset.multiplier);

      if (!Number.isFinite(multiplier)) {
        return;
      }

      saveConfig({ ...config, multiplier });
    });
  });

  featureButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const feature = button.dataset.feature as keyof AntiClipConfig | undefined;

      if (!feature || typeof config[feature] !== "boolean") {
        return;
      }

      saveConfig({ ...config, [feature]: !config[feature] });
    });
  });

  chrome.storage.sync.get(STORAGE_KEY, (items) => {
    config = normalizeConfig(items[STORAGE_KEY]);
    render();
  });
})();
