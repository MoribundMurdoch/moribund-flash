// src/screens/study.js
import { loadDeck } from "../api.js";
import { playSound } from "../sound.js";

export async function renderStudy(app, { goTo, data }) {
  const deckPath = data?.deckPath ?? null;
  const providedDeck = data?.deck ?? null;
  // Get settings from data, or use defaults
  const settings = data?.settings?.study || { showTermFirst: false, centerCard: true };

  renderLoading(app, goTo);

  try {
    const deck = providedDeck || await loadDeck({ path: deckPath });
    const studyDeck = normalizeStudyDeck(deck);
    runStudySession(app, goTo, studyDeck, settings);
  } catch (error) {
    renderStudyError(app, goTo, error);
  }
}

function runStudySession(app, goTo, studyDeck, settings) {
  const state = {
    cardIndex: 0,
    reviewed: 0,
    correct: 0,
    incorrect: 0,
    selectedTerm: null,
    correctTerm: null,
    wrongTerm: null,
    feedback: "",
    locked: false,
    panel: { x: 32, y: 32 },
    mediaPanel: { x: 40, y: 40 },
  };

  if (!studyDeck.cards.length) {
    renderEmptyStudyDeck(app, goTo, studyDeck);
    return;
  }

  function currentCard() { return studyDeck.cards[state.cardIndex] ?? null; }
  
  function currentOptions() {
    return buildAnswerOptions(studyDeck.cards, state.cardIndex);
  }

  function chooseAnswer(choice) {
    if (state.locked) return;
    const card = currentCard();
    if (!card) return;

    // Logic change: Check against term or definition based on settings
    const correctAnswer = settings.showTermFirst ? card.definition : card.term;
    const wasCorrect = choice === correctAnswer;

    state.selectedTerm = choice;
    state.correctTerm = correctAnswer;
    state.wrongTerm = wasCorrect ? null : choice;
    state.feedback = wasCorrect ? "Correct!" : `Wrong. The correct answer was “${correctAnswer}.”`;
    state.locked = true;

    if (wasCorrect) {
      state.correct += 1;
      playSound("correct");
    } else {
      state.incorrect += 1;
      playSound("wrong");
    }

    render();

    window.setTimeout(() => {
      state.reviewed += 1;
      if (state.reviewed >= studyDeck.cards.length) {
        renderCompletion(app, goTo, studyDeck, state);
        return;
      }
      state.cardIndex += 1;
      Object.assign(state, { selectedTerm: null, correctTerm: null, wrongTerm: null, feedback: "", locked: false });
      render();
    }, 800);
  }

  function render() {
    const card = currentCard();
    const options = currentOptions();
    const progress = studyDeck.cards.length ? state.reviewed / studyDeck.cards.length : 0;

    // Settings logic for prompt
    const promptLabel = settings.showTermFirst ? "Term" : "Definition";
    const promptValue = settings.showTermFirst ? card.term : card.definition;

    app.innerHTML = `
      <main class="study-screen study-screen--custom-bg">
        <section
          class="study-panel study-panel--draggable ${settings.centerCard ? 'is-centered' : ''}"
          style="transform: translate(${state.panel.x}px, ${state.panel.y}px);"
        >
          <header class="study-header study-drag-handle">
            <div>
              <p class="kicker">Study Mode</p>
              <h1>${escapeHtml(studyDeck.title)}</h1>
              <p class="study-progress">Reviewed ${state.reviewed} of ${studyDeck.cards.length}</p>
            </div>
            <button class="menu-button back-button" id="study-back" type="button">
              <span class="button-eyebrow">Return</span>
              <span class="button-main">Deck Library</span>
            </button>
          </header>

          <div class="study-progress-bar">
            <div class="study-progress-bar__fill" style="width: ${Math.round(progress * 100)}%"></div>
          </div>

          <article class="study-card">
            <p class="study-card__label">${promptLabel}</p>
            <h2>${escapeHtml(promptValue || "No content")}</h2>

            ${card.exampleSentences.length ? `
              <div class="study-examples">
                <p>Examples</p>
                <ul>${card.exampleSentences.map(ex => `<li>${escapeHtml(ex)}</li>`).join("")}</ul>
              </div>
            ` : ""}
          </article>

          <p class="study-answer-prompt">Choose an answer:</p>

          <div class="study-answer-grid">
            ${options.map((opt, i) => {
              const displayValue = settings.showTermFirst ? opt.definition : opt.term;
              return `
                <button class="study-answer-button ${answerClass(displayValue, state)}"
                  type="button" data-answer="${escapeHtml(displayValue)}"
                  ${state.locked ? "disabled" : ""}>
                  <span class="button-eyebrow">${i + 1}</span>
                  <span class="button-main">${escapeHtml(displayValue || "Untitled")}</span>
                </button>
              `;
            }).join("")}
          </div>

          <div class="study-feedback ${state.wrongTerm ? "is-wrong" : ""} ${state.correctTerm && !state.wrongTerm ? "is-correct" : ""}">
            ${escapeHtml(state.feedback)}
          </div>
        </section>

        ${card.media ? renderMediaWindow(card.media, state.mediaPanel) : ""}
      </main>
    `;

    // Only allow dragging if NOT centered
    if (!settings.centerCard) {
      makeDraggable(app.querySelector(".study-panel--draggable"), ".study-drag-handle", state.panel);
    }
    
    makeDraggable(app.querySelector(".study-media-window"), ".study-media-window__titlebar", state.mediaPanel);

    app.querySelector("#study-back").addEventListener("click", () => {
      playSound("ui_select");
      window.onkeydown = null;
      goTo("deckLibrary");
    });

    app.querySelectorAll(".study-answer-button").forEach(btn => {
      btn.addEventListener("click", () => chooseAnswer(btn.dataset.answer));
    });

    window.onkeydown = (e) => {
      if (e.key === "Escape") { window.onkeydown = null; goTo("deckLibrary"); return; }
      const num = Number(e.key);
      if (num >= 1 && num <= 4) {
        const opt = options[num - 1];
        if (opt) chooseAnswer(settings.showTermFirst ? opt.definition : opt.term);
      }
    };
  }

  render();
}

/** * ALL YOUR IMAGE/MEDIA LOGIC PRESERVED BELOW 
 */

function renderMediaWindow(media, position) {
  const path = media?.path || "";
  const src = mediaSrc(path);
  const type = media?.type || mediaTypeFromPath(path);

  return `
    <aside class="study-media-window" style="transform: translate(${position.x}px, ${position.y}px);">
      <div class="study-media-window__titlebar">
        <span>Media</span>
        <span class="study-media-window__hint">drag</span>
      </div>
      <div class="study-media-window__body">
        ${renderMediaElement(type, src, media?.alt || "Card media")}
      </div>
    </aside>
  `;
}

function renderMediaElement(type, src, alt) {
  if (!src) return "";
  if (type === "image") return `<img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}" draggable="false">`;
  if (type === "video") return `<video src="${escapeAttribute(src)}" controls></video>`;
  if (type === "audio") return `<audio src="${escapeAttribute(src)}" controls></audio>`;
  return "";
}

function mediaSrc(path) {
  if (!path) return "";
  if (/^(https?:|asset:|data:|blob:)/i.test(path)) return path;
  try {
    return window.__TAURI__?.core?.convertFileSrc ? window.__TAURI__.core.convertFileSrc(path) : path;
  } catch { return path; }
}

function mediaTypeFromPath(path) {
  const value = String(path || "").toLowerCase();
  if (/\.(png|jpe?g|gif|webp|svg)$/i.test(value)) return "image";
  if (/\.(mp4|webm|mov|m4v)$/i.test(value)) return "video";
  if (/\.(ogg|mp3|wav)$/i.test(value)) return "audio";
  return "file";
}

function makeDraggable(element, handleSelector, positionStore) {
  if (!element) return;
  const handle = element.querySelector(handleSelector) || element;
  let dragging = false, startX = 0, startY = 0, originalX = 0, originalY = 0;

  handle.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target.closest("button, input")) return;
    dragging = true; startX = e.clientX; startY = e.clientY;
    originalX = positionStore.x; originalY = positionStore.y;
    handle.setPointerCapture(e.pointerId);
    element.classList.add("is-dragging");
  });

  handle.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const canvas = element.closest(".study-screen");
    const maxX = (canvas?.clientWidth || window.innerWidth) - element.offsetWidth;
    const maxY = (canvas?.clientHeight || window.innerHeight) - element.offsetHeight;
    positionStore.x = clamp(originalX + e.clientX - startX, 0, maxX);
    positionStore.y = clamp(originalY + e.clientY - startY, 0, maxY);
    element.style.transform = `translate(${positionStore.x}px, ${positionStore.y}px)`;
  });

  handle.addEventListener("pointerup", (e) => {
    dragging = false; element.classList.remove("is-dragging");
    try { handle.releasePointerCapture(e.pointerId); } catch {}
  });
}

function buildAnswerOptions(cards, currentIndex) {
  const current = cards[currentIndex];
  if (!current) return [];
  const options = [current];
  for (const card of cards) {
    if (options.length >= 4) break;
    if (card.id !== current.id) options.push(card);
  }
  return shuffle(options);
}

function answerClass(term, state) {
  if (!state.locked) return "";
  if (term === state.correctTerm) return "is-correct";
  if (term === state.wrongTerm) return "is-wrong";
  return "";
}

function normalizeStudyDeck(raw) {
  const isV1 = raw?.schema_version === 1 && raw.deck;
  const title = isV1 ? raw.deck.title : (raw?.name || "Untitled Deck");
  const cards = Array.isArray(raw?.cards) ? raw.cards : [];
  return {
    title,
    cards: cards.map(c => isV1 ? normalizeMflashCard(c) : normalizeLegacyCard(c)).filter(isStudyableCard)
  };
}

function normalizeMflashCard(card) {
  return {
    id: card.id || "",
    term: String(card.term || ""),
    definition: String(card.definition || ""),
    exampleSentences: Array.isArray(card.example_sentences) ? card.example_sentences : [],
    media: isPlainObject(card.media) ? card.media : null,
  };
}

function normalizeLegacyCard(card) {
  return {
    id: card.id || "",
    term: String(card.front || card.term || ""),
    definition: String(card.back || card.definition || ""),
    exampleSentences: Array.isArray(card.metadata?.examples) ? card.metadata.examples : [],
    media: isPlainObject(card.metadata?.media) ? card.metadata.media : mediaFromPath(card.metadata?.mediaPath),
  };
}

// Helpers
function mediaFromPath(path) { return (typeof path === "string" && path.trim()) ? { type: "file", path: path.trim(), alt: "" } : null; }
function isStudyableCard(card) { return card.term.trim() || card.definition.trim(); }
function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }
function isPlainObject(v) { return v !== null && typeof v === "object" && !Array.isArray(v); }
function escapeHtml(v) { return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function escapeAttribute(v) { return escapeHtml(v).replace(/'/g, "&#039;"); }

// UI fallbacks
function renderLoading(app, goTo) { app.innerHTML = `<main class="study-screen"><section class="study-panel"><h1>Loading...</h1></button></section></main>`; }
function renderStudyError(app, goTo, err) { app.innerHTML = `<main class="study-screen"><section class="study-panel"><h1>Error</h1><p>${err.message}</p></section></main>`; }
function renderEmptyStudyDeck(app, goTo) { app.innerHTML = `<main class="study-screen"><section class="study-panel"><h1>Empty Deck</h1></section></main>`; }

function renderCompletion(app, goTo, studyDeck, state) {
  playSound("finish");
  const total = studyDeck.cards.length;
  const accuracy = total > 0 ? Math.round((state.correct / total) * 100) : 0;
  app.innerHTML = `
    <main class="study-screen study-screen--custom-bg">
      <section class="study-panel">
        <div class="completion-card">
          <h1>Set complete!</h1>
          <p>Accuracy: ${accuracy}%</p>
          <div class="study-actions">
            <button class="menu-button" id="study-again">Repeat</button>
            <button class="menu-button" id="back-to-decks">Library</button>
          </div>
        </div>
      </section>
    </main>`;
  app.querySelector("#study-again").onclick = () => runStudySession(app, goTo, studyDeck, { showTermFirst: false, centerCard: true });
  app.querySelector("#back-to-decks").onclick = () => goTo("deckLibrary");
}