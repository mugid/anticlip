"use strict";
(() => {
    const DEFAULT_CONFIG = {
        enabled: true,
        multiplier: 0.5,
        hideRecommendations: true,
        hideComments: true,
        hideShorts: true,
        disableAutoplay: true
    };
    const STORAGE_KEY = "anticlip-config";
    const toggle = document.querySelector("[data-toggle]");
    const multiplierButtons = [...document.querySelectorAll("[data-multiplier]")];
    const featureButtons = [...document.querySelectorAll("[data-feature]")];
    const actualRate = document.querySelector("[data-actual-rate]");
    const status = document.querySelector("[data-status]");
    let config = { ...DEFAULT_CONFIG };
    function isConfigShape(value) {
        return typeof value === "object" && value !== null;
    }
    function normalizeConfig(value) {
        const partialConfig = isConfigShape(value) ? value : undefined;
        return {
            enabled: typeof partialConfig?.enabled === "boolean"
                ? partialConfig.enabled
                : DEFAULT_CONFIG.enabled,
            multiplier: typeof partialConfig?.multiplier === "number" &&
                Number.isFinite(partialConfig.multiplier)
                ? partialConfig.multiplier
                : DEFAULT_CONFIG.multiplier,
            hideRecommendations: typeof partialConfig?.hideRecommendations === "boolean"
                ? partialConfig.hideRecommendations
                : DEFAULT_CONFIG.hideRecommendations,
            hideComments: typeof partialConfig?.hideComments === "boolean"
                ? partialConfig.hideComments
                : DEFAULT_CONFIG.hideComments,
            hideShorts: typeof partialConfig?.hideShorts === "boolean"
                ? partialConfig.hideShorts
                : DEFAULT_CONFIG.hideShorts,
            disableAutoplay: typeof partialConfig?.disableAutoplay === "boolean"
                ? partialConfig.disableAutoplay
                : DEFAULT_CONFIG.disableAutoplay
        };
    }
    function saveConfig(nextConfig) {
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
            const feature = button.dataset.feature;
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
            const feature = button.dataset.feature;
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
