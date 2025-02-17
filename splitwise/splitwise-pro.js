// ==UserScript==
// @name        Splitwise Pro
// @namespace   Violentmonkey Scripts
// @match       https://secure.splitwise.com/*
// @grant       none
// @version     1.0
// @author      nikhilweee
// @description Splitwise Pro
// ==/UserScript==

function allElementsLoaded() {
  // return App?.relationshipsRouter?.relationshipDetailsView?.showProUpsell !== undefined;
  return (
    App?.Views?.RelationshipDetails?.prototype?.showProUpsell !== undefined
  );
}

function runScriptWhenReady() {
  if (allElementsLoaded()) {
    // App.relationshipsRouter.relationshipDetailsView.showProUpsell = function (e) { return false; };
    App.Views.RelationshipDetails.prototype.showProUpsell = function (e) {
      return false;
    };
  } else {
    setTimeout(runScriptWhenReady, 100);
  }
}

window.addEventListener("load", runScriptWhenReady);
