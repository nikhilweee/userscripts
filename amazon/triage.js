// ==UserScript==
// @name        Amazon Triage
// @namespace   nikhilweee
// @match       https://www.amazon.com/*
// @grant       none
// @version     0.2
// @author      nikhilweee
// @description Triage products on Amazon (search results only).
// ==/UserScript==

(function () {
  "use strict";

  const STORAGE_KEY = "amazon.triage.v1";

  const store = {
    all() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      } catch (e) {
        return {};
      }
    },
    get(asin) {
      if (!asin) return null;
      return this.all()[asin] || null;
    },
    set(asin, status) {
      if (!asin) return;
      const s = this.all();
      s[asin] = { status, ts: Date.now() };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      } catch (e) {}
    },
    del(asin) {
      const s = this.all();
      delete s[asin];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      } catch (e) {}
    },
  };

  // No detail-page helpers needed — script operates only on search results

  function addStyles() {
    if (document.getElementById("amazon-triage-styles")) return;
    const style = document.createElement("style");
    style.id = "amazon-triage-styles";
    style.textContent = `
      /* search result controls */
  .amazon-triage-result-controls { display:inline-flex; gap:6px; margin-left:6px; align-items:center; }
  /* compact square buttons with centered icon (SVG) for consistent look */
  .amazon-triage-result-controls button { width:28px; height:28px; padding:0; display:inline-flex; align-items:center; justify-content:center; font-size:14px; border-radius:6px; border:1px solid #ddd; background:#fff; cursor:pointer; }
  .amazon-triage-result-controls button:hover { background:#f6f6f6; }
  .amazon-triage-result-controls svg { width:16px; height:16px; display:block; }
  .amazon-triage-result-controls .at-shortlist { color: #b8860b; }
  .amazon-triage-result-controls .at-discard { color: #b22222; }

      /* visual states applied to result item */
      /* stronger yellow for shortlisted items */
      .triaged-shortlist { box-shadow: 0 0 0 2px rgba(255,215,0,0.2) inset; background: rgba(255,238,88,0.20); }
      /* greyed background + reduced opacity for discarded items (darker) */
      .triaged-discard { background: rgba(210,210,210,0.9); opacity: 0.55 !important; filter: grayscale(60%); }
    `;
    document.head.appendChild(style);
  }

  const STATUS_CLASSES = {
    shortlist: "triaged-shortlist",
    discard: "triaged-discard",
  };

  function applyStatus(asin) {
    if (!asin) return;
    const s = store.get(asin);
    const results = Array.from(
      document.querySelectorAll(`div[data-asin="${asin}"]`)
    );

    const clearNode = (n) => {
      n.classList.remove(STATUS_CLASSES.shortlist, STATUS_CLASSES.discard);
      n.style.opacity = "";
      n.style.filter = "";
      n.style.background = "";
    };
    const applyNode = (n, status) => {
      if (!status) return clearNode(n);
      n.classList.add(STATUS_CLASSES[status] || "");
      if (status === "shortlist") n.style.background = "rgba(255,238,88,0.20)";
      if (status === "discard") {
        n.style.opacity = "0.55";
        n.style.filter = "grayscale(60%)";
        n.style.background = "rgba(210,210,210,0.9)";
      }
    };

    results.forEach((n) => {
      clearNode(n);
      if (s && s.status) applyNode(n, s.status);
    });
  }

  function toggleResultStatus(asin, status) {
    const current = store.get(asin);
    if (current && current.status === status) store.del(asin);
    else store.set(asin, status);
    applyStatus(asin);
  }

  function processSearchResults() {
    const results = document.querySelectorAll(
      'div.s-main-slot div[data-asin].s-result-item, div[data-component-type="s-search-result"]'
    );
    results.forEach((r) => {
      const asin = r.getAttribute("data-asin") || (r.dataset && r.dataset.asin);
      if (!asin) return;
      if (r.querySelector(".amazon-triage-result-controls")) return;

      const controls = document.createElement("div");
      controls.className = "amazon-triage-result-controls";

      const star = document.createElement("button");
      star.className = "at-shortlist";
      star.title = "Shortlist";
      star.innerHTML = `
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 .587l3.668 7.431 8.2 1.193-5.934 5.788 1.403 8.181L12 18.896l-7.337 3.884 1.403-8.181L.132 9.211l8.2-1.193z" fill="currentColor"/></svg>
        `;

      const trash = document.createElement("button");
      trash.className = "at-discard";
      trash.title = "Discard";
      trash.innerHTML = `
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 6h18v2H3V6zm2 3h14l-1.2 11.2A2 2 0 0 1 15.8 22H8.2a2 2 0 0 1-1.999-1.8L5 9zm5-7h4l1 2H9l1-2z" fill="currentColor"/></svg>
        `;

      controls.appendChild(star);
      controls.appendChild(trash);

      const actionPlace =
        r.querySelector(".a-row.a-size-base.a-color-secondary") ||
        r.querySelector(".sg-row") ||
        r;
      actionPlace.appendChild(controls);

      star.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleResultStatus(asin, "shortlist");
      });
      trash.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleResultStatus(asin, "discard");
      });

      applyStatus(asin);
    });
  }

  function observeSearchPageAndInsert() {
    processSearchResults();
    const mo = new MutationObserver(() => processSearchResults());
    mo.observe(document.body, { childList: true, subtree: true });
  }

  function whenReady(fn) {
    if (
      document.readyState === "complete" ||
      document.readyState === "interactive"
    )
      fn();
    else window.addEventListener("DOMContentLoaded", fn);
  }

  whenReady(() => {
    try {
      addStyles();
      observeSearchPageAndInsert();
      console.log("amazon-triage: search-only instrumentation initialized");
    } catch (e) {
      console.error("amazon-triage failed to init", e);
    }
  });
})();
