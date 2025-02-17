// ==UserScript==
// @name        Target Cart Summary
// @namespace   Violentmonkey Scripts
// @match       https://www.target.com/cart
// @grant       none
// @version     1.0
// @author      nikhilweee
// @description Summarize Target Cart
// ==/UserScript==

function allElementsLoaded() {
  const detailsCards = document.querySelectorAll('[data-test="cartItem"]');
  return detailsCards.length > 0;
}

function runScriptWhenReady() {
  if (allElementsLoaded()) {
    const detailsCards = document.querySelectorAll('[data-test="cartItem"]');
    const table = document.createElement("table");
    table.style = "width: 100%; text-align: left;";
    table.innerHTML = "<th>Price</th><th>Item</th>";

    detailsCards.forEach((card) => {
      const itemName =
        card
          .querySelector('[data-test="cartItem-title"]')
          ?.textContent.trim() || "";
      const quantity = card.querySelector("select")?.value || "1";
      const itemPrice =
        card
          .querySelector('[data-test="cartItem-price"]')
          ?.textContent.trim() || "";
      let unitPrice =
        card
          .querySelector('[data-test="cartItem-unitPrice"]')
          ?.textContent.trim() || "";
      unitPrice = unitPrice.replace("each ", "") || itemPrice;
      const [itemNameShort, _] = itemName.split(" - ");
      const row = table.insertRow();
      row.innerHTML = `<td>${itemPrice}</td><td>(${quantity}) ${itemNameShort}</td>`;
    });

    const invoiceMetaElement = document.querySelector(
      '[data-test="cart-item-groups"]'
    );
    console.log(table);
    invoiceMetaElement.insertBefore(table, invoiceMetaElement.firstChild);
  } else {
    setTimeout(runScriptWhenReady, 100);
  }
}

window.addEventListener("load", runScriptWhenReady);
