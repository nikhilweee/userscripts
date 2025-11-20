// ==UserScript==
// @name        Reddit Dim Ads
// @namespace   nikhilweee
// @match       https://www.reddit.com/*
// @grant       none
// @version     1.0
// @author      nikhilweee
// @description Dim Ads on Reddit
// ==/UserScript==

function runScriptWhenReady() {
  document.querySelectorAll("shreddit-ad-post").forEach((el) => {
    // el.style.display = "none";
    el.style.opacity = 0.25;
  });
  setTimeout(runScriptWhenReady, 5000);
}

window.addEventListener("load", runScriptWhenReady);
