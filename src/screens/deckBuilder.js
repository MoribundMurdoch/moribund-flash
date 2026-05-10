// src/screens/deckBuilder.js

import { saveDeck } from "../api.js";

const DRAFT_KEY = "moribundFlash.deckBuilderDraft.v2";

function makeId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `card-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emptyCard() {
  return {
    id: makeId(),
    term: "",
    definition: "",
    termLang: "",
    defLang: "",
    hyperlink: "",
    mediaPath: "",
    tagsText: "",
    examplesText: "",
  };
}

function emptyState() {
  return {
    fileName: "",
    tagsText: "",
    mediaPath: "",
    cards: [emptyCard()],
    activeIndex: 0,
    searchText: "",
    status: "",
    error: "",
  };
}

let builderState = loadDraft();

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return emptyState();

    const parsed = JSON.parse(raw);
    const cards = Array.isArray(parsed.cards) && parsed.cards.length > 0
      ? parsed.cards
      : [emptyCard()];

    return {
      ...emptyState(),
      ...parsed,
      cards,
      activeIndex: clampIndex(parsed.activeIndex ?? 0, cards.length),
      status: "",
      error: "",
    };
  } catch {
    return emptyState();
  }
}

function saveDraft() {
  localStorage.setItem(
    DRAFT_KEY,
    JSON.stringify({
      fileName: builderState.fileName,
      tagsText: builderState.tagsText,
      mediaPath: builderState.mediaPath,
      cards: builderState.cards,
      activeIndex: builderState.activeIndex,
      searchText: builderState.searchText,
    })
  );
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

function clampIndex(index, length) {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(Number(index) || 0, length - 1));
}

function activeCard() {
  if (!builderState.cards.length) {
    builderState.cards.push(emptyCard());
    builderState.activeIndex = 0;
  }

  builderState.activeIndex = clampIndex(
    builderState.activeIndex,
    builderState.cards.length
  );

  return builderState.cards[builderState.activeIndex];
}

function splitCommaList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitLines(value) {
  return String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function deckName() {
  const trimmed = String(builderState.fileName || "").trim();
  return trimmed || "new_deck";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function cardTitle(card, index) {
  const term = card.term.trim();
  const definition = card.definition.trim();

  if (term) return term;
  if (definition) return definition.slice(0, 32);
  return `Untitled card ${index + 1}`;
}

function cardSubtitle(card) {
  const lang = card.termLang.trim();
  const tags = card.tagsText.trim();

  if (lang && tags) return `${lang} · ${tags}`;
  if (lang) return lang;
  if (tags) return tags;
  return "No details yet";
}

function filteredCards() {
  const query = builderState.searchText.trim().toLowerCase();

  return builderState.cards
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => {
      if (!query) return true;

      return [
        card.term,
        card.definition,
        card.termLang,
        card.defLang,
        card.tagsText,
        card.examplesText,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
}

function setDeckField(field, value) {
  builderState[field] = value;
  builderState.status = "";
  builderState.error = "";
  saveDraft();
}

function setActiveCardField(field, value) {
  const card = activeCard();
  card[field] = value;
  builderState.status = "";
  builderState.error = "";
  saveDraft();
}

function addCard() {
  const card = emptyCard();
  builderState.cards.push(card);
  builderState.activeIndex = builderState.cards.length - 1;
  builderState.status = "New card added.";
  builderState.error = "";
  saveDraft();
}

function duplicateActiveCard() {
  const card = activeCard();

  const copy = {
    ...card,
    id: makeId(),
  };

  builderState.cards.splice(builderState.activeIndex + 1, 0, copy);
  builderState.activeIndex += 1;
  builderState.status = "Card duplicated.";
  builderState.error = "";
  saveDraft();
}

function removeActiveCard() {
  if (builderState.cards.length <= 1) {
    builderState.cards = [emptyCard()];
    builderState.activeIndex = 0;
  } else {
    builderState.cards.splice(builderState.activeIndex, 1);
    builderState.activeIndex = clampIndex(
      builderState.activeIndex,
      builderState.cards.length
    );
  }

  builderState.status = "Card removed.";
  builderState.error = "";
  saveDraft();
}

function goPreviousCard() {
  builderState.activeIndex = clampIndex(
    builderState.activeIndex - 1,
    builderState.cards.length
  );
  saveDraft();
}

function goNextCard() {
  builderState.activeIndex = clampIndex(
    builderState.activeIndex + 1,
    builderState.cards.length
  );
  saveDraft();
}

function mediaFromPath(path) {
  const trimmed = String(path || "").trim();

  if (!trimmed) return null;

  return {
    type: "file",
    path: trimmed,
    alt: "",
  };
}

function builderStateToDeck() {
  const title = deckName();
  const deckTags = splitCommaList(builderState.tagsText);

  return {
    schema_version: 1,
    deck: {
      id: title
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, "_")
        .replaceAll(/^_+|_+$/g, "") || "new_deck",
      title,
      description: "",
      tags: deckTags,
      media: mediaFromPath(builderState.mediaPath),
      notes: "",
      source_id: "deck-builder",
      extra_fields: {},
    },
    cards: builderState.cards
      .filter((card) => card.term.trim() || card.definition.trim())
      .map((card, index) => ({
        id: card.id || `card-${index + 1}`,
        term: card.term.trim(),
        definition: card.definition.trim(),
        term_language: card.termLang.trim(),
        definition_language: card.defLang.trim(),
        example_sentences: splitLines(card.examplesText),
        tags: splitCommaList(card.tagsText),
        media: mediaFromPath(card.mediaPath),
        hyperlink: card.hyperlink.trim() || null,
        notes: "",
        source_id: null,
        extra_fields: {},
      })),
  };
}

async function saveBuilderDeck({ exitAfterSave = false } = {}) {
  builderState.status = "";
  builderState.error = "";

  const deck = builderStateToDeck();

  if (deck.cards.length === 0) {
    builderState.error = "Add at least one card before saving.";
    saveDraft();
    return { ok: false };
  }

  try {
    await saveDeck(deck);

    builderState.status = `Saved "${deck.deck.title}".`;
    builderState.error = "";

    if (exitAfterSave) {
      clearDraft();
      builderState = emptyState();
    } else {
      saveDraft();
    }

    return { ok: true };
  } catch (error) {
    builderState.error = error?.message || "Failed to save deck.";
    saveDraft();
    return { ok: false };
  }
}

function renderSidebar() {
  const rows = filteredCards();

  return `
    <aside class="builder-sidebar" aria-label="Deck structure">
      <div class="builder-sidebar__top">
        <p class="builder-kicker">Deck Structure</p>
        <strong>${builderState.cards.length} cards</strong>

        <button type="button" class="builder-button builder-button--accent" data-action="add-card">
          + Add Card
        </button>

        <label class="builder-search">
          <span class="sr-only">Search cards</span>
          <input
            type="search"
            value="${escapeHtml(builderState.searchText)}"
            placeholder="Search cards..."
            data-deck-field="searchText"
          >
        </label>
      </div>

      <div class="builder-card-nav">
        ${rows.map(({ card, index }) => `
          <button
            type="button"
            class="builder-card-nav__item ${index === builderState.activeIndex ? "is-active" : ""}"
            data-action="select-card"
            data-index="${index}"
          >
            <span class="builder-card-nav__number">${index + 1}</span>
            <span class="builder-card-nav__text">
              <span>${escapeHtml(cardTitle(card, index))}</span>
              <small>${escapeHtml(cardSubtitle(card))}</small>
            </span>
            <span class="builder-card-nav__dots">⋮</span>
          </button>
        `).join("")}
      </div>
    </aside>
  `;
}

function renderMetadata() {
  return `
    <section class="builder-panel builder-metadata">
      <h2>Deck Metadata</h2>

      <div class="builder-metadata__grid">
        <label class="builder-field">
          <span>Deck Title <small>(file name without extension)</small></span>
          <input
            type="text"
            value="${escapeHtml(builderState.fileName)}"
            placeholder="new_deck"
            data-deck-field="fileName"
          >
        </label>

        <label class="builder-field">
          <span>Deck Tags <small>(comma-separated)</small></span>
          <input
            type="text"
            value="${escapeHtml(builderState.tagsText)}"
            placeholder="language, vocabulary, chapter-1"
            data-deck-field="tagsText"
          >
        </label>

        <label class="builder-field">
          <span>Cover / Media <small>(image / GIF / video)</small></span>
          <input
            type="text"
            value="${escapeHtml(builderState.mediaPath)}"
            placeholder="optional local media path"
            data-deck-field="mediaPath"
          >
        </label>
      </div>
    </section>
  `;
}

function renderActiveCardEditor() {
  const card = activeCard();

  return `
    <section class="builder-editor">
      <div class="builder-editor__bar">
        <h2>Editing Card ${builderState.activeIndex + 1} of ${builderState.cards.length}</h2>

        <div class="builder-editor__actions">
          <button type="button" class="builder-button" data-action="duplicate-active">
            Duplicate
          </button>
          <button type="button" class="builder-button builder-button--danger" data-action="remove-active">
            Remove
          </button>
        </div>
      </div>

      <div class="builder-editor__main">
        <section class="builder-panel builder-zone builder-zone--term">
          <label class="builder-field">
            <span>Term</span>
            <input
              type="text"
              value="${escapeHtml(card.term)}"
              placeholder="front side"
              data-card-field="term"
            >
          </label>

          <label class="builder-field">
            <span>Term Language</span>
            <input
              type="text"
              value="${escapeHtml(card.termLang)}"
              placeholder="Chinese (Simplified), English, ja..."
              data-card-field="termLang"
            >
          </label>
        </section>

        <section class="builder-panel builder-zone builder-zone--definition">
          <label class="builder-field">
            <span>Definition</span>
            <textarea
              rows="8"
              placeholder="back side"
              data-card-field="definition"
            >${escapeHtml(card.definition)}</textarea>
          </label>

          <label class="builder-field">
            <span>Definition Language</span>
            <input
              type="text"
              value="${escapeHtml(card.defLang)}"
              placeholder="English, French, zh-CN..."
              data-card-field="defLang"
            >
          </label>
        </section>

        <section class="builder-panel builder-zone builder-zone--media">
          <label class="builder-field">
            <span>Media <small>(image / GIF / video)</small></span>
            <input
              type="text"
              value="${escapeHtml(card.mediaPath)}"
              placeholder="optional local media path"
              data-card-field="mediaPath"
            >
          </label>

          <label class="builder-field">
            <span>Hyperlink <small>(optional)</small></span>
            <input
              type="text"
              value="${escapeHtml(card.hyperlink)}"
              placeholder="https://..."
              data-card-field="hyperlink"
            >
          </label>
        </section>
      </div>

      <div class="builder-editor__secondary builder-panel">
        <label class="builder-field">
          <span>Tags for this card <small>(comma-separated)</small></span>
          <input
            type="text"
            value="${escapeHtml(card.tagsText)}"
            placeholder="direction, basic, chapter-1"
            data-card-field="tagsText"
          >
        </label>

        <label class="builder-field">
          <span>Example Sentences <small>(one per line)</small></span>
          <textarea
            rows="4"
            placeholder="One example per line"
            data-card-field="examplesText"
          >${escapeHtml(card.examplesText)}</textarea>
        </label>
      </div>

      <footer class="builder-editor__footer">
        <button type="button" class="builder-button" data-action="previous-card">
          ‹ Previous Card
        </button>

        <button type="button" class="builder-button builder-button--accent" data-action="next-card">
          Next Card ›
        </button>
      </footer>
    </section>
  `;
}

function render(app, goTo) {
  app.innerHTML = `
    <section class="deck-builder-v2">
      <header class="builder-topbar">
        <div class="builder-brand">
          <span class="builder-logo">MF</span>
          <span>Moribund Flash</span>
        </div>

        <h1>Deck Builder</h1>

        <div class="builder-topbar__actions">
          <button type="button" class="builder-button" data-action="import-file">
            Import from file...
          </button>
          <button type="button" class="builder-button" data-action="save-draft">
            Save Draft
          </button>
          <button type="button" class="builder-button builder-button--accent" data-action="save-deck">
            Save Deck
          </button>
          <button type="button" class="builder-button" data-action="exit">
            Exit
          </button>
        </div>
      </header>

      <div class="builder-shell">
        ${renderSidebar()}

        <main class="builder-main">
          ${builderState.status ? `<p class="builder-notice">${escapeHtml(builderState.status)}</p>` : ""}
          ${builderState.error ? `<p class="builder-notice builder-notice--error">${escapeHtml(builderState.error)}</p>` : ""}

          ${renderMetadata()}
          ${renderActiveCardEditor()}

          <p class="builder-shortcuts">
            Shortcuts: Ctrl+N New Card · Ctrl+D Duplicate · Delete Remove
          </p>
        </main>
      </div>
    </section>
  `;

  app.addEventListener("input", (event) => {
    const target = event.target;

    if (target.dataset.deckField) {
      setDeckField(target.dataset.deckField, target.value);
      if (target.dataset.deckField === "searchText") {
        render(app, goTo);
      }
      return;
    }

    if (target.dataset.cardField) {
      setActiveCardField(target.dataset.cardField, target.value);
    }
  });

  app.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const action = button.dataset.action;

    if (action === "select-card") {
      builderState.activeIndex = clampIndex(button.dataset.index, builderState.cards.length);
      saveDraft();
      render(app, goTo);
      return;
    }

    if (action === "add-card") {
      addCard();
      render(app, goTo);
      return;
    }

    if (action === "duplicate-active") {
      duplicateActiveCard();
      render(app, goTo);
      return;
    }

    if (action === "remove-active") {
      removeActiveCard();
      render(app, goTo);
      return;
    }

    if (action === "previous-card") {
      goPreviousCard();
      render(app, goTo);
      return;
    }

    if (action === "next-card") {
      goNextCard();
      render(app, goTo);
      return;
    }

    if (action === "save-draft") {
      saveDraft();
      builderState.status = "Draft saved locally.";
      builderState.error = "";
      render(app, goTo);
      return;
    }

    if (action === "save-deck") {
      await saveBuilderDeck();
      render(app, goTo);
      return;
    }

    if (action === "import-file") {
      builderState.error = "Import is not wired yet. Next stop: Tauri file picker.";
      builderState.status = "";
      render(app, goTo);
      return;
    }

    if (action === "exit") {
      goTo("deckList");
    }
  });

  app.addEventListener("keydown", async (event) => {
    if (event.ctrlKey && event.key.toLowerCase() === "n") {
      event.preventDefault();
      addCard();
      render(app, goTo);
    }

    if (event.ctrlKey && event.key.toLowerCase() === "d") {
      event.preventDefault();
      duplicateActiveCard();
      render(app, goTo);
    }

    if (event.key === "Delete" && document.activeElement === document.body) {
      event.preventDefault();
      removeActiveCard();
      render(app, goTo);
    }
  });
}

export function deckBuilderScreen(app, goTo) {
  render(app, goTo);
}

export default deckBuilderScreen;
