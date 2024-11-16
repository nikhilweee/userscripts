// ==UserScript==
// @name        Reddit Remove Ads
// @namespace   Violentmonkey Scripts
// @match       https://www.reddit.com/*
// @grant       none
// @version     1.0
// @author      Nikhil Verma
// @description Remove Ads from Reddit
// ==/UserScript==

function runScriptWhenReady() {
  document.querySelectorAll("shreddit-ad-post").forEach((el) => {
    // el.style.display = "none";
    el.style.opacity = 0.25;
  });
  setTimeout(runScriptWhenReady, 5000);
}

window.addEventListener("load", runScriptWhenReady);
