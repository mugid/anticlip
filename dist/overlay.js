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
    const HOST_ID = "anticlip-overlay-host";
    const featureLabels = [
        ["hideRecommendations", "Watch recommendations", '<path d="M4 6h16M4 12h10M4 18h7"/>'],
        ["hideHomeRecommendations", "Home feed", '<path d="M4 5h7v6H4zM13 5h7v6h-7zM4 13h7v6H4zM13 13h7v6h-7z"/>'],
        ["hideComments", "Comments", '<path d="M5 6h14v10H8l-3 3V6ZM9 10h6M9 13h4"/>'],
        ["hideShorts", "Shorts", '<path d="m9 7 7 5-7 5V7Z"/><rect x="5" y="3" width="14" height="18" rx="4"/>'],
        ["disableAutoplay", "Autoplay", '<path d="M7 5v14M17 5v14"/>']
    ];
    let config = { ...DEFAULT_CONFIG };
    let host = null;
    let panel = null;
    let keyHandler = null;
    function normalizeConfig(value) {
        const partial = typeof value === "object" && value !== null
            ? value
            : {};
        return {
            enabled: typeof partial.enabled === "boolean" ? partial.enabled : DEFAULT_CONFIG.enabled,
            multiplier: typeof partial.multiplier === "number" && Number.isFinite(partial.multiplier)
                ? Math.round(Math.min(Math.max(partial.multiplier, 0.1), 1) * 20) / 20
                : DEFAULT_CONFIG.multiplier,
            hideRecommendations: typeof partial.hideRecommendations === "boolean"
                ? partial.hideRecommendations
                : DEFAULT_CONFIG.hideRecommendations,
            hideHomeRecommendations: typeof partial.hideHomeRecommendations === "boolean"
                ? partial.hideHomeRecommendations
                : DEFAULT_CONFIG.hideHomeRecommendations,
            hideComments: typeof partial.hideComments === "boolean"
                ? partial.hideComments
                : DEFAULT_CONFIG.hideComments,
            hideShorts: typeof partial.hideShorts === "boolean"
                ? partial.hideShorts
                : DEFAULT_CONFIG.hideShorts,
            disableAutoplay: typeof partial.disableAutoplay === "boolean"
                ? partial.disableAutoplay
                : DEFAULT_CONFIG.disableAutoplay
        };
    }
    function render() {
        if (!panel) {
            return;
        }
        const masterToggle = panel.querySelector("[data-toggle]");
        const rate = panel.querySelector("[data-actual-rate]");
        const selector = panel.querySelector(".speed-selector");
        const multiplierInput = panel.querySelector("[data-multiplier-input]");
        if (masterToggle) {
            masterToggle.setAttribute("aria-pressed", String(config.enabled));
            masterToggle.setAttribute("aria-label", config.enabled ? "Turn AntiClip off" : "Turn AntiClip on");
        }
        if (rate) {
            rate.textContent = `${config.multiplier}x`;
        }
        const selectorProgress = (config.multiplier - 0.1) / 0.9;
        selector?.style.setProperty("--selector-progress", String(selectorProgress));
        if (multiplierInput) {
            multiplierInput.value = String(config.multiplier);
        }
        panel.querySelectorAll("[data-feature]").forEach((button) => {
            const feature = button.dataset.feature;
            button.setAttribute("aria-pressed", String(Boolean(config[feature])));
        });
    }
    function save(nextConfig) {
        config = nextConfig;
        try {
            chrome.storage.sync.set({ [STORAGE_KEY]: config }, render);
        }
        catch {
            closeOverlay();
        }
    }
    function closeOverlay() {
        if (!host) {
            return;
        }
        const currentHost = host;
        currentHost.dataset.open = "false";
        host = null;
        panel = null;
        if (keyHandler) {
            document.removeEventListener("keydown", keyHandler, true);
            keyHandler = null;
        }
        window.setTimeout(() => currentHost.remove(), 160);
    }
    function buildFeatureRows() {
        return featureLabels.map(([feature, label, icon]) => `
      <button class="row feature-row" type="button" data-feature="${feature}" aria-pressed="false">
        <span class="row-icon"><svg aria-hidden="true" viewBox="0 0 24 24">${icon}</svg></span>
        <strong>${label}</strong>
        <span class="switch" aria-hidden="true">
          <svg viewBox="0 0 20 20">
            <path class="switch-check" d="m5.5 10.2 3 3.1 6-6.4" />
            <path class="switch-off" d="m6.5 6.5 7 7m0-7-7 7" />
          </svg>
        </span>
      </button>
    `).join("");
    }
    function openOverlay() {
        if (host || document.getElementById(HOST_ID)) {
            return;
        }
        let logoUrl;
        try {
            logoUrl = chrome.runtime.getURL("icons/logo.svg");
        }
        catch {
            return;
        }
        host = document.createElement("div");
        host.id = HOST_ID;
        host.dataset.open = "false";
        const shadow = host.attachShadow({ mode: "closed" });
        shadow.innerHTML = `
      <style>
        :host { all: initial; }
        *, *::before, *::after { box-sizing: border-box; }
        .backdrop {
          position: fixed; inset: 0; z-index: 2147483647;
          background: rgb(10 12 18 / 7%); backdrop-filter: blur(1.5px);
          opacity: 0; transition: opacity 150ms ease;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
        }
        :host([data-open="true"]) .backdrop { opacity: 1; }
        .panel {
          position: absolute; top: 16px; right: 16px;
          width: 324px; height: 420px; padding: 18px 14px 14px;
          overflow: hidden; border: 1px solid #e4e6eb; border-radius: 28px;
          background: #fff; color: #17181c;
          box-shadow: 0 24px 65px rgb(17 20 28 / 24%), 0 4px 14px rgb(17 20 28 / 12%);
          opacity: 0; transform: translateY(-8px) scale(.975); transform-origin: top right;
          transition: opacity 150ms ease, transform 150ms cubic-bezier(.2,.8,.2,1);
        }
        :host([data-open="true"]) .panel { opacity: 1; transform: none; }
        button { font: inherit; }
        .topbar { display: flex; align-items: center; justify-content: space-between; height: 34px; margin-bottom: 10px; }
        .logo { display: block; width: 89px; height: auto; }
        .toggle { position: relative; min-width: 52px; height: 30px; overflow: hidden; border: 1px solid #dfe2e8; border-radius: 999px; background: #fff; color: #fff; cursor: pointer; font-size: 13px; font-weight: 600; transition: transform 140ms cubic-bezier(.23,1,.32,1); }
        .toggle:active { transform: scale(.97); }
        .toggle-fill { position: absolute; inset: 0; background: #17181c; clip-path: inset(0 0 0 0); transition: clip-path 240ms cubic-bezier(.77,0,.175,1); }
        .toggle[aria-pressed="false"] .toggle-fill { clip-path: inset(100% 0 0 0); }
        .toggle-label { position: absolute; z-index: 1; inset: 0; display: grid; place-items: center; transition: opacity 160ms ease, transform 200ms cubic-bezier(.23,1,.32,1), filter 160ms ease; }
        .toggle-label-on { color: #fff; opacity: 1; transform: translateY(0); }
        .toggle-label-off { color: #6d7078; opacity: 0; transform: translateY(-5px); filter: blur(2px); }
        .toggle[aria-pressed="false"] .toggle-label-on { opacity: 0; transform: translateY(5px); filter: blur(2px); }
        .toggle[aria-pressed="false"] .toggle-label-off { opacity: 1; transform: translateY(0); filter: none; }
        .group { padding: 0; border: 0; border-radius: 0; background: transparent; }
        .group + .group { margin-top: 24px; }
        .group-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; color: #6d7078; font-size: 13px; font-weight: 500; }
        .value { color: #245bd8; font-weight: 600; }
        .speed-selector { --selector-progress: .5; position: relative; }
        .selector-rail { position: absolute; top: 0; left: 0; right: 0; height: 32px; overflow: hidden; border-radius: 11px; background: #e9ebf0; }
        .selector-fill { position: absolute; inset: 0; border-radius: inherit; background: #386de8; transform: scaleX(var(--selector-progress)); transform-origin: left center; }
        .selector-stop { position: absolute; z-index: 1; top: 50%; width: 1px; height: 12px; background: rgb(23 24 28 / 22%); transform: translate(-50%, -50%); }
        .selector-stop-25 { left: 16.6667%; }
        .selector-stop-50 { left: 44.4444%; }
        .selector-stop-75 { left: 72.2222%; }
        .selector-input { position: relative; z-index: 2; display: block; width: 100%; height: 32px; margin: 0; appearance: none; background: transparent; cursor: ew-resize; }
        .selector-input::-webkit-slider-runnable-track { height: 32px; background: transparent; }
        .selector-input::-webkit-slider-thumb { width: 4px; height: 24px; margin-top: 4px; appearance: none; border: 0; border-radius: 3px; background: #fff; box-shadow: 0 1px 4px rgb(17 20 28 / 32%); }
        .selector-input:focus-visible { outline: 2px solid #386de8; outline-offset: 5px; border-radius: 999px; }
        .selector-labels { position: relative; height: 15px; margin: 7px 7px 0; color: #777b84; font-size: 11px; font-variant-numeric: tabular-nums; }
        .selector-labels span { position: absolute; transform: translateX(-50%); }
        .selector-labels .label-min { left: 0; transform: none; }
        .selector-labels .label-25 { left: 16.6667%; }
        .selector-labels .label-50 { left: 44.4444%; }
        .selector-labels .label-75 { left: 72.2222%; }
        .selector-labels .label-max { right: 0; transform: none; }
        .row { display: grid; grid-template-columns: 28px 1fr 32px; gap: 10px; align-items: center; width: 100%; height: 42px; padding: 0; border: 0; border-radius: 13px; background: transparent; color: inherit; text-align: left; cursor: pointer; transition: transform 120ms cubic-bezier(.23,1,.32,1); }
        .row:active { transform: scale(.985); }
        .row + .row { margin-top: 3px; }
        .row-icon { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 9px; background: #f3f4f7; color: #656a74; }
        .row-icon svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2; }
        .row strong { min-width: 0; overflow: hidden; color: #17181c; font-size: 14px; font-weight: 500; line-height: 1.2; text-overflow: ellipsis; white-space: nowrap; }
        .feature-row[aria-pressed="true"] .row-icon { background: #eaf0ff; color: #245bd8; }
        .switch { display: grid; place-items: center; width: 30px; height: 28px; border: 1px solid #dfe2e8; border-radius: 9px; background: #f0f1f4; color: #777c87; transition: background 160ms ease, border-color 160ms ease, color 160ms ease, transform 180ms cubic-bezier(.23,1,.32,1); }
        .switch svg { width: 18px; height: 18px; overflow: visible; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2.2; }
        .switch path { transform-origin: center; transition: opacity 140ms ease, transform 180ms cubic-bezier(.23,1,.32,1); }
        .switch-check { opacity: 0; transform: scale(.7) rotate(-12deg); }
        .switch-off { opacity: 1; transform: scale(1) rotate(0); }
        .feature-row[aria-pressed="true"] .switch { border-color: #386de8; background: #386de8; color: #fff; transform: rotate(0.001deg); }
        .feature-row[aria-pressed="true"] .switch-check { opacity: 1; transform: scale(1) rotate(0); }
        .feature-row[aria-pressed="true"] .switch-off { opacity: 0; transform: scale(.7) rotate(12deg); }
        @media (max-width: 370px) { .panel { right: 8px; width: calc(100vw - 16px); } }
        @media (prefers-reduced-motion: reduce) { .backdrop, .panel, .toggle-fill, .toggle-label, .switch, .switch path { transition-duration: 1ms; } }
      </style>
      <div class="backdrop" data-backdrop>
        <main class="panel" role="dialog" aria-modal="true" aria-label="AntiClip settings">
          <header class="topbar">
            <img class="logo" src="${logoUrl}" alt="AntiClip" />
            <button class="toggle" type="button" data-toggle aria-pressed="true" aria-label="Turn AntiClip off">
              <span class="toggle-fill"></span>
              <span class="toggle-label toggle-label-on">On</span>
              <span class="toggle-label toggle-label-off">Off</span>
            </button>
          </header>
          <section class="group" aria-label="Playback speed">
            <div class="group-head"><span>Speed multiplier</span><span class="value" data-actual-rate>0.5x</span></div>
            <div class="speed-selector">
              <span class="selector-rail" aria-hidden="true">
                <span class="selector-fill"></span>
                <span class="selector-stop selector-stop-25"></span>
                <span class="selector-stop selector-stop-50"></span>
                <span class="selector-stop selector-stop-75"></span>
              </span>
              <input class="selector-input" data-multiplier-input type="range" min="0.1" max="1" step="0.05" value="0.5" aria-label="Speed multiplier" />
              <div class="selector-labels" aria-hidden="true">
                <span class="label-min">0.1</span><span class="label-25">0.25</span><span class="label-50">0.5</span><span class="label-75">0.75</span><span class="label-max">1</span>
              </div>
            </div>
          </section>
          <section class="group" aria-label="YouTube cleanup">${buildFeatureRows()}</section>
        </main>
      </div>
    `;
        panel = shadow.querySelector(".panel");
        const backdrop = shadow.querySelector("[data-backdrop]");
        backdrop?.addEventListener("click", (event) => {
            if (event.target === backdrop) {
                closeOverlay();
            }
        });
        const masterToggle = panel?.querySelector("[data-toggle]");
        masterToggle?.addEventListener("click", () => {
            save({ ...config, enabled: !config.enabled });
        });
        panel?.querySelector("[data-multiplier-input]")?.addEventListener("input", (event) => {
            const multiplier = Math.round(Number(event.currentTarget.value) * 20) / 20;
            if (Number.isFinite(multiplier) && multiplier >= 0.1 && multiplier <= 1) {
                save({ ...config, multiplier });
            }
        });
        panel?.querySelectorAll("[data-feature]").forEach((button) => {
            button.addEventListener("click", () => {
                const feature = button.dataset.feature;
                if (typeof config[feature] === "boolean") {
                    save({ ...config, [feature]: !config[feature] });
                }
            });
        });
        keyHandler = (event) => {
            if (event.key === "Escape") {
                closeOverlay();
            }
        };
        document.addEventListener("keydown", keyHandler, true);
        document.documentElement.append(host);
        try {
            chrome.storage.sync.get(STORAGE_KEY, (items) => {
                const storedConfig = items[STORAGE_KEY];
                config = normalizeConfig(storedConfig);
                if (storedConfig?.multiplier !== config.multiplier) {
                    save(config);
                }
                else {
                    render();
                }
                window.requestAnimationFrame(() => {
                    if (host) {
                        host.dataset.open = "true";
                    }
                });
            });
        }
        catch {
            closeOverlay();
        }
    }
    chrome.runtime.onMessage.addListener((message) => {
        if (typeof message !== "object" ||
            message === null ||
            message.type !== "TOGGLE_ANTICLIP_OVERLAY") {
            return;
        }
        if (host) {
            closeOverlay();
        }
        else {
            openOverlay();
        }
    });
})();
