/* Minimal filter page renderer */
(function () {
  "use strict";

  const app = window.AnimeFlix;
  if (!app) return;

  function renderFilterView() {
    const root = document.getElementById("filterRoot");
    if (!root) return;

    if (!root.children.length) {
      root.innerHTML = `
        <div class="fp-empty">
          <div class="fp-empty__icon">Filter</div>
          <div class="fp-empty__title">Use search and genre in the top bar</div>
          <div class="fp-empty__text">This page reflects the active search tools available in the header.</div>
          <a class="fp-empty__btn" href="#/">Go Home</a>
        </div>
      `;
    }
  }

  app.renderFilterView = renderFilterView;
})();
