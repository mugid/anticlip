"use strict";
(() => {
    const DEFAULT_CONFIG = {
        enabled: true,
        multiplier: 0.5,
        hideRecommendations: false,
        hideHomeRecommendations: false,
        hideComments: false,
        hideShorts: false,
        disableAutoplay: false
    };
    const STORAGE_KEY = "anticlip-config";
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
            hideHomeRecommendations: typeof partialConfig?.hideHomeRecommendations === "boolean"
                ? partialConfig.hideHomeRecommendations
                : DEFAULT_CONFIG.hideHomeRecommendations,
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
    function postConfig(config) {
        const message = {
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
