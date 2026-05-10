import { loadOptions, saveOptions } from "../../optionsState.js";
import { playSound } from "../../sound.js";
import { getGlobalHTML, attachGlobalListeners } from "./tabGlobal.js";
import { getMainMenuHTML, attachMainMenuListeners } from "./tabMainMenu.js";
import { getStudyHTML, attachStudyListeners } from "./tabStudy.js";
import { getBuilderHTML, attachBuilderListeners } from "./tabBuilder.js";

const tabs = {
  global: { getHTML: getGlobalHTML, attach: attachGlobalListeners },
  mainMenu: { getHTML: getMainMenuHTML, attach: attachMainMenuListeners },
  study: { getHTML: getStudyHTML, attach: attachStudyListeners },
  builder: { getHTML: getBuilderHTML, attach: attachBuilderListeners },
};

export function renderOptions(app, { goTo }) {
  const state = loadOptions();
  let currentTab = "global";

  function renderFull() {
    app.innerHTML = `
      <main class="options-screen">
        <section class="options-panel">
          <header class="options-header">
            <h1>Options</h1>
            <button class="menu-button back-button" id="options-back" type="button">
              <span class="button-eyebrow">Return</span>
              <span class="button-main">Back to Menu</span>
            </button>
          </header>

          <div class="options-layout">
            <aside class="options-sidebar">
              <button class="sidebar-tab ${currentTab === "global" ? "is-active" : ""}" data-tab="global">Global</button>
              <button class="sidebar-tab ${currentTab === "mainMenu" ? "is-active" : ""}" data-tab="mainMenu">Main Menu</button>
              <button class="sidebar-tab ${currentTab === "study" ? "is-active" : ""}" data-tab="study">Study</button>
              <button class="sidebar-tab ${currentTab === "builder" ? "is-active" : ""}" data-tab="builder">Deck Builder</button>
            </aside>

            <div class="options-content" id="options-content-area">
              ${tabs[currentTab].getHTML(state)}
            </div>
          </div>
        </section>
      </main>
    `;

    // Hook up the back button
    app.querySelector("#options-back").addEventListener("click", () => {
      goTo("mainMenu");
    });

    // Hook up the sidebar navigation
    const sidebarButtons = app.querySelectorAll(".sidebar-tab");
    sidebarButtons.forEach(btn => {
      btn.addEventListener("click", (e) => {
        const selectedTab = e.target.dataset.tab;
        if (selectedTab !== currentTab) {
          currentTab = selectedTab;
          playSound("ui_select");
          renderFull(); // Re-render the layout with the new tab active
        }
      });
    });

    // Attach form listeners for whichever tab is currently visible
    tabs[currentTab].attach(app, state, saveOptions);
  }

  renderFull();
}