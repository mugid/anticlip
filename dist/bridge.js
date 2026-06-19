const DEFAULT_CONFIG = {
    enabled: true,
    multiplier: 0.5
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
            : DEFAULT_CONFIG.multiplier
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
