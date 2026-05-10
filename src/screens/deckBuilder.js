// src/screens/deckBuilder.js

import { importMediaFile, pickMediaFile, saveDeck } from "../api.js";

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

function isSupportedMediaPath(path) {
  return /\.(png|jpe?g|gif|webp|svg|mp4|webm|mov|m4v|ogg|mp3|wav)$/i.test(
    String(path || "")
  );
}

function mediaTypeFromPath(path) {
  const value = String(path || "").toLowerCase();

  if (/\.(png|jpe?g|gif|webp|svg)$/i.test(value)) return "image";
  if (/\.(mp4|webm|mov|m4v)$/i.test(value)) return "video";
  if (/\.(ogg|mp3|wav)$/i.test(value)) return "audio";

  return "file";
}

function filePathFromFile(file) {
  return (
    file?.path ||
    file?.webkitRelativePath ||
    file?.name ||
    ""
  );
}

async function attachImportedMediaPath(sourcePath, target) {
  try {
    const imported = await importMediaFile(sourcePath);
    const storedPath = imported?.stored_path || imported?.storedPath;

    if (!storedPath) {
      builderState.error = "Media import did not return a stored path.";
      builderState.status = "";
      saveDraft();
      return;
    }

    if (target === "deck") {
      builderState.mediaPath = storedPath;
      builderState.status = `Imported deck media: ${imported.file_name || imported.fileName || storedPath}`;
      builderState.error = "";
      saveDraft();
      return;
    }

    if (target === "card") {
      const card = activeCard();
      card.mediaPath = storedPath;
      builderState.status = `Imported card media: ${imported.file_name || imported.fileName || storedPath}`;
      builderState.error = "";
      saveDraft();
    }
  } catch (error) {
    builderState.error = error?.message || "Failed to import media.";
    builderState.status = "";
    saveDraft();
  }
}

async function attachMediaFile(file, target) {
  if (!file) {
    builderState.error = "No media file was selected.";
    builderState.status = "";
    saveDraft();
    return;
  }

  const path = filePathFromFile(file);

  if (!path) {
    builderState.error = "The selected file did not expose a usable path. Try the Browse button, which uses the native Tauri picker.";
    builderState.status = "";
    saveDraft();
    return;
  }

  if (!isSupportedMediaPath(path)) {
    builderState.error = `Unsupported media type: ${path}`;
    builderState.status = "";
    saveDraft();
    return;
  }

  await attachImportedMediaPath(path, target);
}

async function browseAndImportMedia(target) {
  try {
    const sourcePath = await pickMediaFile();

    if (!sourcePath) {
      return;
    }

    await attachImportedMediaPath(sourcePath, target);
  } catch (error) {
    builderState.error = error?.message || "Failed to pick media.";
    builderState.status = "";
    saveDraft();
  }
}

async function handleMediaDrop(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const file = event.dataTransfer?.files?.[0];
  await attachMediaFile(file, target);
}

function preventMediaDragDefault(event) {
  event.preventDefault();
  event.stopPropagation();
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

function removeCardAtIndex(index) {
  const safeIndex = clampIndex(index, builderState.cards.length);

  if (builderState.cards.length <= 1) {
    builderState.cards = [emptyCard()];
    builderState.activeIndex = 0;
  } else {
    builderState.cards.splice(safeIndex, 1);

    if (builderState.activeIndex >= builderState.cards.length) {
      builderState.activeIndex = builderState.cards.length - 1;
    } else if (builderState.activeIndex > safeIndex) {
      builderState.activeIndex -= 1;
    }
  }

  builderState.status = "Card removed.";
  builderState.error = "";
  saveDraft();
}

function moveCard(fromIndex, toIndex) {
  const from = clampIndex(fromIndex, builderState.cards.length);
  const to = clampIndex(toIndex, builderState.cards.length);

  if (from === to) return;

  const [card] = builderState.cards.splice(from, 1);
  builderState.cards.splice(to, 0, card);

  if (builderState.activeIndex === from) {
    builderState.activeIndex = to;
  } else if (from < builderState.activeIndex && to >= builderState.activeIndex) {
    builderState.activeIndex -= 1;
  } else if (from > builderState.activeIndex && to <= builderState.activeIndex) {
    builderState.activeIndex += 1;
  }

  builderState.status = "Card reordered.";
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
    type: mediaTypeFromPath(trimmed),
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
  const isSearching = builderState.searchText.trim().length > 0;

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

        ${isSearching ? `
          <small class="builder-search-note">
            Reordering is disabled while search is active.
          </small>
        ` : ""}
      </div>

      <div class="builder-card-nav">
        ${rows.map(({ card, index }) => `
          <article
            class="builder-card-nav__item ${index === builderState.activeIndex ? "is-active" : ""}"
            data-card-row
            data-index="${index}"
            data-reorderable="${!isSearching}"
          >
            <span
              class="builder-card-nav__drag-handle"
              data-card-drag-handle
              data-index="${index}"
              draggable="${!isSearching}"
              title="${isSearching ? "Clear search before reordering" : "Drag to reorder card"}"
              aria-hidden="true"
            >↕</span>

            <button
              type="button"
              class="builder-card-nav__select"
              data-action="select-card"
              data-index="${index}"
            >
              <span class="builder-card-nav__number">${index + 1}</span>
              <span class="builder-card-nav__text">
                <span>${escapeHtml(cardTitle(card, index))}</span>
                <small>${escapeHtml(cardSubtitle(card))}</small>
              </span>
            </button>

            <button
              type="button"
              class="builder-card-nav__delete"
              data-action="delete-card"
              data-index="${index}"
              title="Delete card"
              aria-label="Delete card ${index + 1}"
            >×</button>
          </article>
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

        <label class="builder-field builder-media-dropzone" data-media-drop="deck">
          <span>Cover / Media <small>(drop image / GIF / video / audio, browse, or paste path)</small></span>

          <div class="builder-media-dropzone__row">
            <input
              type="text"
              value="${escapeHtml(builderState.mediaPath)}"
              placeholder="drop media here, browse, or paste local path"
              data-deck-field="mediaPath"
            >

            <button type="button" class="builder-button" data-action="browse-deck-media">
              Browse...
            </button>
          </div>

          <input
            class="builder-media-picker"
            type="file"
            accept="image/*,video/*,audio/*,.gif,.webp,.svg"
            data-media-picker="deck"
          >

          <small class="builder-media-dropzone__hint">Drop media here or click Browse to attach it to the whole deck.</small>
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
          <label class="builder-field builder-media-dropzone" data-media-drop="card">
            <span>Media <small>(drop image / GIF / video / audio, browse, or paste path)</small></span>

            <div class="builder-media-dropzone__row">
              <input
                type="text"
                value="${escapeHtml(card.mediaPath)}"
                placeholder="drop media here, browse, or paste local path"
                data-card-field="mediaPath"
              >

              <button type="button" class="builder-button" data-action="browse-card-media">
                Browse...
              </button>
            </div>

            <input
              class="builder-media-picker"
              type="file"
              accept="image/*,video/*,audio/*,.gif,.webp,.svg"
              data-media-picker="card"
            >

            <small class="builder-media-dropzone__hint">Drop media here or click Browse to attach it to this card.</small>
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

let globalEventsBound = false;

function eventIsInsideDeckBuilder(event) {
  return Boolean(event.target.closest(".deck-builder-v2"));
}

function isTypingInField() {
  const activeTag = document.activeElement?.tagName?.toLowerCase() || "";
  return activeTag === "input" || activeTag === "textarea" || activeTag === "select";
}

function bindGlobalEvents(app, goTo) {
  app.addEventListener("input", (event) => {
    if (!eventIsInsideDeckBuilder(event)) return;

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
    if (!eventIsInsideDeckBuilder(event)) return;

    const actionElement = event.target.closest("[data-action]");
    if (!actionElement) return;

    const action = actionElement.dataset.action;

    if (action === "select-card") {
      builderState.activeIndex = clampIndex(
        actionElement.dataset.index,
        builderState.cards.length
      );
      saveDraft();
      render(app, goTo);
      return;
    }

    if (action === "delete-card") {
      const index = Number(actionElement.dataset.index);
      const card = builderState.cards[index];
      const title = card ? cardTitle(card, index) : `card ${index + 1}`;

      if (confirm(`Delete "${title}"?`)) {
        removeCardAtIndex(index);
        render(app, goTo);
      }
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

    if (action === "browse-deck-media") {
      await browseAndImportMedia("deck");
      render(app, goTo);
      return;
    }

    if (action === "browse-card-media") {
      await browseAndImportMedia("card");
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
    if (!app.querySelector(".deck-builder-v2")) return;

    const isTyping = isTypingInField();
    const key = event.key;

    if (event.ctrlKey && key.toLowerCase() === "n") {
      event.preventDefault();
      addCard();
      render(app, goTo);
      return;
    }

    if (event.ctrlKey && key.toLowerCase() === "d") {
      event.preventDefault();
      duplicateActiveCard();
      render(app, goTo);
      return;
    }

    if (key === "Delete" && !isTyping) {
      event.preventDefault();
      removeActiveCard();
      render(app, goTo);
      return;
    }

    const isPreviousKey = key === "ArrowLeft" || key === "ArrowUp";
    const isNextKey = key === "ArrowRight" || key === "ArrowDown";
    const canNavigate = !isTyping || event.altKey;

    if (isPreviousKey && canNavigate) {
      event.preventDefault();
      goPreviousCard();
      render(app, goTo);
      return;
    }

    if (isNextKey && canNavigate) {
      event.preventDefault();
      goNextCard();
      render(app, goTo);
    }
  });

  app.addEventListener("dragstart", (event) => {
    if (!eventIsInsideDeckBuilder(event)) return;

    const handle = event.target.closest("[data-card-drag-handle]");
    const row = handle?.closest("[data-card-row]");

    if (!handle || !row || row.dataset.reorderable !== "true") {
      event.preventDefault();
      return;
    }

    event.dataTransfer.setData("text/plain", row.dataset.index);
    event.dataTransfer.effectAllowed = "move";
    row.classList.add("is-dragging");
  });

  app.addEventListener("dragover", (event) => {
    if (!eventIsInsideDeckBuilder(event)) return;

    const row = event.target.closest("[data-card-row]");
    if (!row || row.dataset.reorderable !== "true") return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    row.classList.add("is-drag-over-card");
  });

  app.addEventListener("dragleave", (event) => {
    const row = event.target.closest("[data-card-row]");
    if (row) row.classList.remove("is-drag-over-card");
  });

  app.addEventListener("dragend", () => {
    app.querySelectorAll(".is-dragging").forEach((row) => {
      row.classList.remove("is-dragging");
    });

    app.querySelectorAll(".is-drag-over-card").forEach((row) => {
      row.classList.remove("is-drag-over-card");
    });
  });

  app.addEventListener("drop", (event) => {
    if (!eventIsInsideDeckBuilder(event)) return;

    const row = event.target.closest("[data-card-row]");
    if (!row || row.dataset.reorderable !== "true") return;

    event.preventDefault();

    const fromIndex = Number(event.dataTransfer.getData("text/plain"));
    const toIndex = Number(row.dataset.index);

    if (Number.isInteger(fromIndex) && Number.isInteger(toIndex)) {
      moveCard(fromIndex, toIndex);
      render(app, goTo);
    }
  });
}

function bindLocalMediaEvents(app, goTo) {
  app.querySelectorAll("[data-media-drop]").forEach((zone) => {
    zone.addEventListener("dragover", (event) => {
      preventMediaDragDefault(event);
      zone.classList.add("is-drag-over");
    });

    zone.addEventListener("dragleave", () => {
      zone.classList.remove("is-drag-over");
    });

    zone.addEventListener("drop", async (event) => {
      zone.classList.remove("is-drag-over");
      await handleMediaDrop(event, zone.dataset.mediaDrop);
      render(app, goTo);
    });
  });

  app.querySelectorAll("[data-media-picker]").forEach((picker) => {
    picker.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      await attachMediaFile(file, picker.dataset.mediaPicker);
      render(app, goTo);
    });
  });
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
            Shortcuts: Ctrl+N New Card · Ctrl+D Duplicate · Delete Remove · Arrow Keys Navigate · Alt+Arrow while typing
          </p>
        </main>
      </div>
    </section>
  `;

  if (!globalEventsBound) {
    bindGlobalEvents(app, goTo);
    globalEventsBound = true;
  }

  bindLocalMediaEvents(app, goTo);
}

export function deckBuilderScreen(app, goTo) {
  render(app, goTo);
}

export default deckBuilderScreen;