import { playSound } from "../sound.js";

const menuItems = [
  {
    id: "deckList",
    label: "Choose a deck...",
    eyebrow: "Load an existing study deck",
    status: "Open a local deck and begin studying.",
  },
  {
    id: "deckBuilder",
    label: "Deck Builder",
    eyebrow: "Create something cursed but useful",
    status: "Build a new flashcard deck from scratch.",
  },
  {
    id: "options",
    label: "Options",
    eyebrow: "Tune the study chamber",
    status: "Adjust fonts, sounds, backgrounds, and interface behavior.",
  },
  {
    id: "controls",
    label: "Controls",
    eyebrow: "Button lore and keyboard whatnot",
    status: "Review keyboard shortcuts and interaction controls.",
  },
];

let focusedIndex = 0;

export function renderMainMenu(app, { goTo }) {
  app.innerHTML = `
    <main class="menu-screen">
      <section class="menu-panel" aria-label="Moribund Flash main menu">
        <div class="brand-block">
          <p class="kicker">Moribund Institute presents</p>
          <h1>Moribund Flash</h1>
          <p class="subtitle">Offline flashcard learning for lexical whatnot.</p>
        </div>

        <div class="menu-stage">
          <img
            class="menu-critter"
            src="./assets/ui/mor_critter.png"
            alt=""
            aria-hidden="true"
          />

          <div class="menu-buttons" role="menu">
            ${menuItems
              .map(
                (item, index) => `
                  <button
                    class="menu-button"
                    type="button"
                    role="menuitem"
                    data-index="${index}"
                    data-screen="${item.id}"
                  >
                    <span class="button-eyebrow">${item.eyebrow}</span>
                    <span class="button-main">${item.label}</span>
                  </button>
                `
              )
              .join("")}
          </div>
        </div>

        <p class="menu-status" id="menu-status"></p>

        <footer class="menu-footer">
          <span>↑ ↓ move</span>
          <span>Enter select</span>
          <span>Esc returns later, once there is somewhere to flee from.</span>
        </footer>
      </section>
    </main>
  `;

  const buttons = [...app.querySelectorAll(".menu-button")];
  const status = app.querySelector("#menu-status");
  const critter = app.querySelector(".menu-critter");

  function setFocus(index) {
    const isNewFocus = focusedIndex !== wrapIndex(index, menuItems.length);
    focusedIndex = wrapIndex(index, menuItems.length);

    buttons.forEach((button, buttonIndex) => {
      const active = buttonIndex === focusedIndex;
      button.classList.toggle("is-focused", active);
      button.setAttribute("aria-current", active ? "true" : "false");
    });

    const activeButton = buttons[focusedIndex];
    const activeItem = menuItems[focusedIndex];

    status.textContent = activeItem.status;

    moveCritterToButton(critter, activeButton);

    // FORCE the browser's native focus to follow our custom logic
    if (document.activeElement !== activeButton) {
      activeButton.focus();
    }

    if (isNewFocus) {
      playSound("ui_select");
    }
  }

  function activateFocused() {
    const item = menuItems[focusedIndex];
    goTo(item.id);
  }

  buttons.forEach((button, index) => {
    button.addEventListener("mouseenter", () => setFocus(index));
    button.addEventListener("focus", () => setFocus(index));
    button.addEventListener("click", () => {
      setFocus(index);
      activateFocused();
    });
  });

  window.onkeydown = handleMenuKeys;

  function handleMenuKeys(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setFocus(focusedIndex + 1);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setFocus(focusedIndex - 1);
    }

    if (event.key === "Enter") {
      event.preventDefault();
      activateFocused();
    }
  }

  let scrollCooldown = false;

  function handleWheel(event) {
    if (scrollCooldown) return;

    if (event.deltaY > 0) {
      setFocus(focusedIndex + 1);
      triggerCooldown();
    } else if (event.deltaY < 0) {
      setFocus(focusedIndex - 1);
      triggerCooldown();
    }
  }

  function triggerCooldown() {
    scrollCooldown = true;
    setTimeout(() => {
      scrollCooldown = false;
    }, 150);
  }

  window.onwheel = handleWheel;

  requestAnimationFrame(() => {
    setFocus(focusedIndex);
    buttons[focusedIndex]?.focus();
  });
}

function wrapIndex(index, length) {
  return ((index % length) + length) % length;
}

function moveCritterToButton(critter, button) {
  const stage = button.closest(".menu-stage");
  const stageRect = stage.getBoundingClientRect();
  const buttonRect = button.getBoundingClientRect();

  const x = buttonRect.left - stageRect.left - 58;
  const y = buttonRect.top - stageRect.top + buttonRect.height / 2 - 24;

  critter.style.transform = `translate(${x}px, ${y}px)`;
}