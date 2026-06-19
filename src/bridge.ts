(() => {
  type AntiClipConfig = {
    enabled: boolean;
    multiplier: number;
    hideRecommendations: boolean;
    hideComments: boolean;
    hideShorts: boolean;
    disableAutoplay: boolean;
  };

  type AntiClipWindowMessage = {
    source: "anticlip-extension";
    type: "CONFIG";
    config: AntiClipConfig;
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

  function postConfig(config: AntiClipConfig) {
    const message: AntiClipWindowMessage = {
      source: "anticlip-extension",
      type: "CONFIG",
      config
    };

    window.postMessage(message, window.location.origin);
  }

  chrome.storage.sync.get(STORAGE_KEY, (items) => {
    postConfig(normalizeConfig(items[STORAGE_KEY]));
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync" || !changes[STORAGE_KEY]) {
      return;
    }

    postConfig(normalizeConfig(changes[STORAGE_KEY].newValue));
  });
})();
