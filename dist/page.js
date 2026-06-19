"use strict";
(() => {
    const DEFAULT_CONFIG = {
        enabled: true,
        multiplier: 0.5
    };
    const PATCH_FLAG = "__anticlipPlaybackRatePatched__";
    const globalWindow = window;
    if (globalWindow[PATCH_FLAG]) {
        return;
    }
    globalWindow[PATCH_FLAG] = true;
    const descriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "playbackRate");
    if (!descriptor?.get || !descriptor?.set) {
        return;
    }
    const nativeGet = descriptor.get;
    const nativeSet = descriptor.set;
    const visibleRates = new WeakMap();
    const internalRateChanges = new WeakMap();
    let config = { ...DEFAULT_CONFIG };
    function clampMultiplier(value) {
        if (!Number.isFinite(value)) {
            return DEFAULT_CONFIG.multiplier;
        }
        return Math.min(Math.max(value, 0.1), 1);
    }
    function getRealRateForVisibleRate(visibleRate) {
        if (!config.enabled) {
            return visibleRate;
        }
        return visibleRate * clampMultiplier(config.multiplier);
    }
    function setNativeRate(element, visibleRate) {
        const realRate = getRealRateForVisibleRate(visibleRate);
        if (nativeGet.call(element) === realRate) {
            return;
        }
        internalRateChanges.set(element, realRate);
        nativeSet.call(element, realRate);
    }
    function getVisibleRate(element) {
        const explicitRate = visibleRates.get(element);
        if (typeof explicitRate === "number") {
            return explicitRate;
        }
        const nativeRate = nativeGet.call(element);
        return nativeRate;
    }
    function applyConfigToCurrentMedia() {
        document.querySelectorAll("video, audio").forEach((element) => {
            if (element instanceof HTMLMediaElement) {
                if (!visibleRates.has(element)) {
                    visibleRates.set(element, nativeGet.call(element));
                }
                setNativeRate(element, getVisibleRate(element));
            }
        });
    }
    Object.defineProperty(HTMLMediaElement.prototype, "playbackRate", {
        configurable: true,
        enumerable: descriptor.enumerable,
        get() {
            return getVisibleRate(this);
        },
        set(value) {
            visibleRates.set(this, value);
            setNativeRate(this, value);
        }
    });
    document.addEventListener("ratechange", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLMediaElement)) {
            return;
        }
        if (internalRateChanges.get(target) === nativeGet.call(target)) {
            internalRateChanges.delete(target);
            return;
        }
        visibleRates.set(target, nativeGet.call(target));
        setNativeRate(target, getVisibleRate(target));
    }, true);
    window.addEventListener("message", (event) => {
        if (event.source !== window) {
            return;
        }
        const message = event.data;
        if (message?.source !== "anticlip-extension" ||
            message.type !== "CONFIG" ||
            !message.config) {
            return;
        }
        config = {
            enabled: Boolean(message.config.enabled),
            multiplier: clampMultiplier(message.config.multiplier)
        };
        applyConfigToCurrentMedia();
    });
    new MutationObserver(applyConfigToCurrentMedia).observe(document.documentElement, {
        childList: true,
        subtree: true
    });
    window.addEventListener("yt-navigate-finish", applyConfigToCurrentMedia);
    applyConfigToCurrentMedia();
})();
