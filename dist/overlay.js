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
                ? partial.multiplier
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
        if (masterToggle) {
            masterToggle.textContent = config.enabled ? "On" : "Off";
            masterToggle.setAttribute("aria-pressed", String(config.enabled));
        }
        if (rate) {
            rate.textContent = `${config.multiplier}x`;
        }
        panel.querySelectorAll("[data-multiplier]").forEach((button) => {
            button.setAttribute("aria-pressed", String(Number(button.dataset.multiplier) === config.multiplier));
        });
        panel.querySelectorAll("[data-feature]").forEach((button) => {
            const feature = button.dataset.feature;
            button.setAttribute("aria-pressed", String(Boolean(config[feature])));
        });
    }
    function save(nextConfig) {
        config = nextConfig;
        chrome.storage.sync.set({ [STORAGE_KEY]: config }, render);
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
        <span class="switch" aria-hidden="true"></span>
      </button>
    `).join("");
    }
    function openOverlay() {
        if (host || document.getElementById(HOST_ID)) {
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
        .toggle { min-width: 52px; height: 30px; border: 1px solid #e4e6eb; border-radius: 999px; background: #17181c; color: #fff; cursor: pointer; font-size: 13px; font-weight: 600; }
        .toggle[aria-pressed="false"] { background: #fff; color: #6d7078; }
        .group { padding: 12px; border: 1px solid #e4e6eb; border-radius: 20px; background: #fbfbfc; }
        .group + .group { margin-top: 10px; }
        .group-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; color: #6d7078; font-size: 13px; font-weight: 500; }
        .value { color: #245bd8; font-weight: 600; }
        .segments { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; }
        .segments button { height: 36px; border: 1px solid #e4e6eb; border-radius: 12px; background: #fff; color: #555963; cursor: pointer; font-size: 14px; font-weight: 500; }
        .segments button[aria-pressed="true"] { border-color: #245bd8; background: #386de8; color: #fff; box-shadow: 0 8px 16px rgb(56 109 232 / 22%); }
        .row { display: grid; grid-template-columns: 28px 1fr 36px; gap: 10px; align-items: center; width: 100%; height: 42px; padding: 0; border: 0; border-radius: 13px; background: transparent; color: inherit; text-align: left; cursor: pointer; }
        .row + .row { margin-top: 3px; }
        .row-icon { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 9px; background: #f3f4f7; color: #656a74; }
        .row-icon svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2; }
        .row strong { min-width: 0; overflow: hidden; color: #17181c; font-size: 14px; font-weight: 500; line-height: 1.2; text-overflow: ellipsis; white-space: nowrap; }
        .feature-row[aria-pressed="true"] .row-icon { background: #eaf0ff; color: #245bd8; }
        .switch { position: relative; width: 36px; height: 22px; border-radius: 999px; background: #d9dce3; transition: background 160ms ease; }
        .switch::after { position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 2px 6px rgb(23 24 28 / 18%); content: ""; transition: transform 160ms ease; }
        .feature-row[aria-pressed="true"] .switch { background: #386de8; }
        .feature-row[aria-pressed="true"] .switch::after { transform: translateX(14px); }
        @media (max-width: 370px) { .panel { right: 8px; width: calc(100vw - 16px); } }
        @media (prefers-reduced-motion: reduce) { .backdrop, .panel, .switch, .switch::after { transition: none; } }
      </style>
      <div class="backdrop" data-backdrop>
        <main class="panel" role="dialog" aria-modal="true" aria-label="AntiClip settings">
          <header class="topbar">
            <img class="logo" src="${chrome.runtime.getURL("icons/logo.svg")}" alt="AntiClip" />
            <button class="toggle" type="button" data-toggle aria-pressed="true">On</button>
          </header>
          <section class="group" aria-label="Playback speed">
            <div class="group-head"><span>Speed multiplier</span><span class="value" data-actual-rate>0.5x</span></div>
            <div class="segments" aria-label="Speed multiplier">
              <button type="button" data-multiplier="0.25">0.25</button>
              <button type="button" data-multiplier="0.5">0.5</button>
              <button type="button" data-multiplier="0.75">0.75</button>
              <button type="button" data-multiplier="1">1</button>
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
        panel?.querySelector("[data-toggle]")?.addEventListener("click", () => {
            save({ ...config, enabled: !config.enabled });
        });
        panel?.querySelectorAll("[data-multiplier]").forEach((button) => {
            button.addEventListener("click", () => {
                const multiplier = Number(button.dataset.multiplier);
                if (Number.isFinite(multiplier)) {
                    save({ ...config, multiplier });
                }
            });
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
        chrome.storage.sync.get(STORAGE_KEY, (items) => {
            config = normalizeConfig(items[STORAGE_KEY]);
            render();
            window.requestAnimationFrame(() => {
                if (host) {
                    host.dataset.open = "true";
                }
            });
        });
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
