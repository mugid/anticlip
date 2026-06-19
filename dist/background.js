"use strict";
(() => {
    chrome.action.onClicked.addListener((tab) => {
        if (typeof tab.id !== "number") {
            return;
        }
        chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_ANTICLIP_OVERLAY" }, () => {
            void chrome.runtime.lastError;
        });
    });
})();
