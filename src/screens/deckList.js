// src/screens/deckList.js
import { listDecks } from "../api.js";
import { playSound } from "../sound.js";

export async function renderDeckList(app, { goTo }) {
  // 1. Render the Shell and Loading State
  app.innerHTML = `
    <main class="deck-list-screen">
      <section class="deck-list-panel">
        <header class="deck-list-header">
          <h1>Choose a Deck</h1>
          <button class="menu-button back-button" id="deck-list-back" type="button">
            <span class="button-eyebrow">Return</span>
            <span class="button-main">Back to Menu</span>
          </button>
        </header>

        <div id="deck-list-container" class="deck-grid">
          <div class="loading-state">
            <p>Querying the Moribund archives...</p>
          </div>
        </div>
      </section>
    </main>
  `;

  const container = app.querySelector("#deck-list-container");
  const backBtn = app.querySelector("#deck-list-back");

  backBtn.addEventListener("click", () => {
    playSound("ui_select");
    goTo("mainMenu");
  });

  // 2. Attempt to fetch decks from the Tauri API
  try {
    const decks = await listDecks();
    
    if (decks.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No decks found in the /decks folder.</p>
          <button class="menu-button" onclick="window.location.reload()">Refresh</button>
        </div>
      `;
      return;
    }

    // 3. Render the list of cards
    container.innerHTML = decks.map(deck => `
      <button class="deck-card" data-path="${deck.path}">
        <div class="deck-card-info">
          <span class="deck-format-tag">${deck.format.toUpperCase()}</span>
          <h2 class="deck-name">${deck.name}</h2>
          <p class="deck-meta">${deck.cardCount} cards</p>
        </div>
      </button>
    `).join("");

    // 4. Select a deck
    container.querySelectorAll(".deck-card").forEach(card => {
      card.addEventListener("click", () => {
        playSound("ui_select");
        goTo("study", { deckPath: card.dataset.path });
      });
    });

  } catch (err) {
    // 5. Catch the inevitable "Rust command not found" error
    container.innerHTML = `
      <div class="error-state">
        <p class="error-message">Backend Connection Failed</p>
        <code>${err.message}</code>
        <p class="error-hint">This is expected! The Rust side hasn't been programmed to handle 'list_decks' yet.</p>
        <button class="menu-button" id="retry-btn">Retry Connection</button>
      </div>
    `;
    app.querySelector("#retry-btn").addEventListener("click", () => renderDeckList(app, { goTo }));
  }
}