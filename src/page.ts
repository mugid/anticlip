(() => {
  type AntiClipConfig = {
    enabled: boolean;
    multiplier: number;
    hideRecommendations: boolean;
    hideHomeRecommendations: boolean;
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
    hideRecommendations: false,
    hideHomeRecommendations: false,
    hideComments: false,
    hideShorts: false,
    disableAutoplay: false
  };

  const PATCH_FLAG = "__anticlipPlaybackRatePatched__";
  const globalWindow = window as typeof window & Record<string, unknown>;

  if (globalWindow[PATCH_FLAG]) {
    return;
  }

  globalWindow[PATCH_FLAG] = true;

  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLMediaElement.prototype,
    "playbackRate"
  );

  if (!descriptor?.get || !descriptor?.set) {
    return;
  }

  const nativeGet = descriptor.get;
  const nativeSet = descriptor.set;
  const visibleRates = new WeakMap<HTMLMediaElement, number>();
  const internalRateChanges = new WeakMap<HTMLMediaElement, number>();
  const STYLE_ID = "anticlip-page-rules";

  let config: AntiClipConfig = { ...DEFAULT_CONFIG };
  let lastRuleStyle = "";
  let pageConfigFrame = 0;

  function clampMultiplier(value: number) {
    if (!Number.isFinite(value)) {
      return DEFAULT_CONFIG.multiplier;
    }

    return Math.min(Math.max(value, 0.1), 1);
  }

  function getRealRateForVisibleRate(visibleRate: number) {
    if (!config.enabled) {
      return visibleRate;
    }

    return visibleRate * clampMultiplier(config.multiplier);
  }

  function setNativeRate(element: HTMLMediaElement, visibleRate: number) {
    const realRate = getRealRateForVisibleRate(visibleRate);

    if (nativeGet.call(element) === realRate) {
      return;
    }

    internalRateChanges.set(element, realRate);
    nativeSet.call(element, realRate);
  }

  function getVisibleRate(element: HTMLMediaElement) {
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
        if (config.enabled && config.disableAutoplay) {
          element.autoplay = false;
          element.removeAttribute("autoplay");
        }

        if (!visibleRates.has(element)) {
          visibleRates.set(element, nativeGet.call(element));
        }

        setNativeRate(element, getVisibleRate(element));
      }
    });
  }

  function getRuleStyle() {
    if (!config.enabled) {
      return "";
    }

    const rules: string[] = [];

    if (config.hideRecommendations) {
      rules.push(`
        ytd-watch-next-secondary-results-renderer {
          display: none !important;
        }
      `);
    }

    if (config.hideHomeRecommendations) {
      rules.push(`
        ytd-browse[page-subtype="home"] ytd-rich-grid-renderer {
          display: none !important;
        }
      `);
    }

    if (config.hideComments) {
      rules.push(`
        ytd-comments,
        ytd-comments-header-renderer,
        ytd-comment-thread-renderer,
        ytd-watch-flexy #comments,
        #comments {
          display: none !important;
        }
      `);
    }

    if (config.hideShorts) {
      rules.push(`
        ytd-mini-guide-entry-renderer[aria-label="Shorts"],
        ytd-guide-entry-renderer:has(a[href^="/shorts"]),
        ytd-reel-shelf-renderer,
        ytd-rich-shelf-renderer[is-shorts],
        ytd-rich-section-renderer:has(a[href^="/shorts"]),
        ytd-rich-item-renderer:has(a[href^="/shorts"]),
        ytd-video-renderer:has(a[href^="/shorts"]),
        ytd-grid-video-renderer:has(a[href^="/shorts"]),
        ytd-compact-video-renderer:has(a[href^="/shorts"]) {
          display: none !important;
        }
      `);
    }

    return rules.join("\n");
  }

  function applyPageRules() {
    const nextRuleStyle = getRuleStyle();

    if (nextRuleStyle === lastRuleStyle) {
      return;
    }

    lastRuleStyle = nextRuleStyle;

    let style = document.getElementById(STYLE_ID);

    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      document.documentElement.append(style);
    }

    style.textContent = nextRuleStyle;
  }

  function disableAutoplayControl() {
    if (!config.enabled || !config.disableAutoplay) {
      return;
    }

    const toggle = document.querySelector<HTMLElement>(
      ".ytp-autonav-toggle-button[aria-checked='true'], .ytp-autonav-toggle-button[aria-pressed='true']"
    );

    toggle?.click();
  }

  function applyPageConfig() {
    applyConfigToCurrentMedia();
    applyPageRules();
    disableAutoplayControl();
  }

  function schedulePageConfig() {
    if (pageConfigFrame) {
      return;
    }

    pageConfigFrame = window.requestAnimationFrame(() => {
      pageConfigFrame = 0;
      applyPageConfig();
    });
  }

  Object.defineProperty(HTMLMediaElement.prototype, "playbackRate", {
    configurable: true,
    enumerable: descriptor.enumerable,
    get() {
      return getVisibleRate(this);
    },
    set(value: number) {
      visibleRates.set(this, value);
      setNativeRate(this, value);
    }
  });

  document.addEventListener(
    "ratechange",
    (event) => {
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
    },
    true
  );

  window.addEventListener("message", (event) => {
    if (event.source !== window) {
      return;
    }

    const message = event.data as Partial<AntiClipWindowMessage>;

    if (
      message?.source !== "anticlip-extension" ||
      message.type !== "CONFIG" ||
      !message.config
    ) {
      return;
    }

    config = {
      enabled: Boolean(message.config.enabled),
      multiplier: clampMultiplier(message.config.multiplier),
      hideRecommendations: Boolean(message.config.hideRecommendations),
      hideHomeRecommendations: Boolean(message.config.hideHomeRecommendations),
      hideComments: Boolean(message.config.hideComments),
      hideShorts: Boolean(message.config.hideShorts),
      disableAutoplay: Boolean(message.config.disableAutoplay)
    };

    schedulePageConfig();
  });

  new MutationObserver(schedulePageConfig).observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  window.addEventListener("yt-navigate-finish", schedulePageConfig);
  schedulePageConfig();
})();
