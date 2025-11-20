// ==UserScript==
// @name        Amazon Triage
// @namespace   nikhilweee
// @match       https://www.amazon.com/*
// @grant       none
// @version     1.0
// @author      nikhilweee
// @description Triage Amazon search results.
// @icon        https://www.amazon.com/favicon.ico
// ==/UserScript==

(function () {
  "use strict";

  const CONFIG = {
    key: "com.nikhilweee.amazon_triage",
    colors: {
      shortlist: {
        border: "#059669", // Emerald 600
        bg: "rgba(5, 150, 105, 0.05)",
        text: "#047857",
        bannerBg: "#ecfdf5",
        bannerBorder: "#6ee7b7"
      },
      discard: {
        border: "#ef4444", // Red 500
        bg: "rgba(239, 68, 68, 0.05)",
        text: "#b91c1c",
        bannerBg: "#fef2f2",
        bannerBorder: "#fca5a5"
      },
      neutral: {
        bg: "#f3f4f6",
        text: "#1f2937",
        border: "#d1d5db",
        hoverBg: "#e5e7eb",
        hoverBorder: "#9ca3af"
      }
    }
  };

  const Triage = {
    state: {},
    hoverAsin: null,

    init() {
      this.load();
      this.injectStyles();
      this.initObservers();
      this.initEvents();
      this.renderClearButton();
      this.checkDetailPage();
    },

    load() {
      try {
        this.state = JSON.parse(localStorage.getItem(CONFIG.key) || "{}");
      } catch (e) {
        this.state = {};
      }
    },

    save() {
      try {
        localStorage.setItem(CONFIG.key, JSON.stringify(this.state));
      } catch (e) { }
    },

    setStatus(asin, status) {
      if (!asin) return;
      if (this.state[asin] === status) delete this.state[asin];
      else this.state[asin] = status;
      this.save();
      this.sync(asin);
    },

    sync(asin) {
      const status = this.state[asin];
      document.querySelectorAll(`div[data-asin="${asin}"][data-at-ready="true"]`).forEach(el => {
        el.classList.remove("at-s", "at-d");
        if (status) el.classList.add(`at-${status}`);
      });
    },

    clearAll() {
      if (!confirm("Clear all triage data?")) return;
      this.state = {};
      this.save();
      document.querySelectorAll(".at-s, .at-d").forEach(el => el.classList.remove("at-s", "at-d"));
      document.querySelector(".at-banner")?.remove();
    },

    processCard(el) {
      if (el.hasAttribute("data-at-ready")) return;
      if (!el.querySelector('.s-image')) return;

      el.setAttribute("data-at-ready", "true");
      el.classList.add("at-card");

      const imgContainer = el.querySelector('.s-image-fixed-height, .s-product-image-container') || el;
      if (getComputedStyle(imgContainer).position === 'static') imgContainer.style.position = 'relative';

      const ui = document.createElement('div');
      ui.className = 'at-ui';
      ui.innerHTML = `
        <button class="at-btn s" title="Shortlist (S)">★</button>
        <button class="at-btn d" title="Discard (D)">✕</button>
      `;
      imgContainer.appendChild(ui);

      const asin = el.getAttribute("data-asin");
      if (this.state[asin]) el.classList.add(`at-${this.state[asin]}`);
    },

    injectStyles() {
      const c = CONFIG.colors;
      const css = `
        .at-card { position: relative !important; transition: all 0.2s ease; }
        .at-card::after {
          content: ""; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          box-sizing: border-box; border: 0 solid transparent; pointer-events: none; z-index: 20;
        }
        
        /* Shortlist (Green) */
        .at-s { background: ${c.shortlist.bg}; }
        .at-s::after { border-width: 4px; border-color: ${c.shortlist.border}; }
        .at-btn.s { color: ${c.shortlist.border}; }

        /* Discard (Red) */
        .at-d { background: ${c.discard.bg}; opacity: 0.6; filter: grayscale(1); }
        .at-d::after { border-width: 4px; border-color: ${c.discard.border}; }
        .at-btn.d { color: ${c.discard.border}; }

        /* UI Overlay */
        .at-ui { position: absolute; top: 6px; right: 6px; display: none; gap: 4px; z-index: 100; }
        [data-asin]:hover .at-ui { display: flex; }
        .at-btn { 
          width: 24px; height: 24px; border-radius: 50%; border: 1px solid #ddd; 
          background: #fff; cursor: pointer; padding: 0; display: grid; place-items: center; 
          font-size: 14px; transition: transform 0.1s; 
        }
        .at-btn:hover { transform: scale(1.15); background: #f8f8f8; }

        /* Banner & Button Shared Styles */
        .at-banner, .at-clear {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 8px 12px; border-radius: 4px; font-size: 14px; font-weight: 700;
          font-family: inherit;
        }

        /* Banner Specifics */
        .at-banner { display: flex; width: fit-content; margin-bottom: 8px; gap: 6px; }
        .at-banner.at-s { background: ${c.shortlist.bannerBg}; color: ${c.shortlist.text}; border: 1px solid ${c.shortlist.bannerBorder}; }
        .at-banner.at-d { background: ${c.discard.bannerBg}; color: ${c.discard.text}; border: 1px solid ${c.discard.bannerBorder}; }

        /* Clear Button Specifics */
        .at-clear {
          background: ${c.neutral.bg}; color: ${c.neutral.text}; border: 1px solid ${c.neutral.border};
          cursor: pointer; transition: all 0.2s;
        }
        .at-clear:hover { background: ${c.neutral.hoverBg}; border-color: ${c.neutral.hoverBorder}; }
      `;
      const style = document.createElement("style");
      style.textContent = css;
      document.head.appendChild(style);
    },

    initEvents() {
      // Global Click Delegation
      document.addEventListener("click", (e) => {
        if (e.target.matches(".at-clear")) {
          this.clearAll();
          return;
        }
        const btn = e.target.closest(".at-btn");
        if (!btn) return;

        e.preventDefault();
        e.stopPropagation();

        const card = btn.closest("div[data-asin]");
        if (!card) return;
        this.setStatus(card.getAttribute("data-asin"), btn.classList.contains("s") ? "s" : "d");
      });

      // Hover Tracking
      document.addEventListener("mouseover", (e) => {
        const card = e.target.closest("div[data-asin]");
        this.hoverAsin = card ? card.getAttribute("data-asin") : null;
      });

      // Keyboard Shortcuts
      document.addEventListener("keydown", (e) => {
        if (!this.hoverAsin || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
        const k = e.key.toLowerCase();
        if (k === "s") this.setStatus(this.hoverAsin, "s");
        else if (k === "d") this.setStatus(this.hoverAsin, "d");
        else if (k === "x") this.setStatus(this.hoverAsin, null);
      });
    },

    initObservers() {
      const mo = new MutationObserver((mutations) => {
        for (const m of mutations) {
          m.addedNodes.forEach(n => {
            if (n.nodeType === 1) {
              if (n.matches && n.matches('div[data-asin]')) this.processCard(n);
              n.querySelectorAll?.('div[data-asin]').forEach(el => this.processCard(el));
            }
          });
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
      document.querySelectorAll('div[data-asin]').forEach(el => this.processCard(el));
    },

    renderClearButton() {
      const mainSlot = document.querySelector('.s-main-slot');
      if (!mainSlot) return;

      const btn = document.createElement("button");
      btn.className = "at-clear";
      btn.textContent = "Reset Triage";

      const wrapper = document.createElement('div');
      wrapper.style.cssText = "display: flex; justify-content: flex-start; padding: 12px 0;";
      wrapper.appendChild(btn);
      mainSlot.parentNode.insertBefore(wrapper, mainSlot);
    },

    checkDetailPage() {
      const asin = document.getElementById("ASIN")?.value;
      if (asin && this.state[asin]) {
        const title = document.getElementById("productTitle");
        if (title) {
          const st = this.state[asin];
          const b = document.createElement("div");
          b.className = `at-banner at-${st}`;
          b.innerHTML = st === "s" ? "<span>★</span> Shortlisted" : "<span>✕</span> Discarded";
          title.parentNode.insertBefore(b, title);
        }
      }
    }
  };

  Triage.init();
})();
