// src/screens/study.js

import { loadDeck } from "../api.js";
import { playSound } from "../sound.js";

export async function renderStudy(app, { goTo, data }) {
  const deckPath = data?.deckPath ?? null;
  const providedDeck = data?.deck ?? null;

  renderLoading(app, goTo);

  try {
    const deck = providedDeck || await loadDeck({ path: deckPath });
    const studyDeck = normalizeStudyDeck(deck);
    runStudySession(app, goTo, studyDeck);
  } catch (error) {
    renderStudyError(app, goTo, error);
  }
}

function runStudySession(app, goTo, studyDeck) {
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
    panel: {
      x: 0,
      y: 0,
    },
  };

  if (!studyDeck.cards.length) {
    renderEmptyStudyDeck(app, goTo, studyDeck);
    return;
  }

  function currentCard() {
    return studyDeck.cards[state.cardIndex] ?? null;
  }

  function currentOptions() {
    return buildAnswerOptions(studyDeck.cards, state.cardIndex);
  }

  function chooseAnswer(term) {
    if (state.locked) return;

    const card = currentCard();
    if (!card) return;

    const wasCorrect = term === card.term;

    state.selectedTerm = term;
    state.correctTerm = card.term;
    state.wrongTerm = wasCorrect ? null : term;
    state.feedback = wasCorrect
      ? "Correct!"
      : `Wrong. The correct answer was “${card.term}.”`;
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
      state.selectedTerm = null;
      state.correctTerm = null;
      state.wrongTerm = null;
      state.feedback = "";
      state.locked = false;

      render();
    }, 800);
  }

  function render() {
    const card = currentCard();
    const options = currentOptions();
    const progress = studyDeck.cards.length
      ? state.reviewed / studyDeck.cards.length
      : 0;

    app.innerHTML = `
      <main class="study-screen study-screen--custom-bg">
        <section
          class="study-panel study-panel--draggable"
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

          <div class="study-progress-bar" aria-label="Study progress">
            <div class="study-progress-bar__fill" style="width: ${Math.round(progress * 100)}%"></div>
          </div>

          <article class="study-card">
            <p class="study-card__label">Definition</p>
            <h2>${escapeHtml(card.definition || "No definition provided.")}</h2>

            ${card.exampleSentences.length ? `
              <div class="study-examples">
                <p>Examples</p>
                <ul>
                  ${card.exampleSentences.map((example) => `
                    <li>${escapeHtml(example)}</li>
                  `).join("")}
                </ul>
              </div>
            ` : ""}

            ${card.media ? `
              <div class="study-card-media-note">
                <p>Media attached:</p>
                <code>${escapeHtml(card.media.path || "")}</code>
              </div>
            ` : ""}
          </article>

          <p class="study-answer-prompt">Choose an answer:</p>

          <div class="study-answer-grid">
            ${options.map((option, index) => `
              <button
                class="study-answer-button ${answerClass(option.term, state)}"
                type="button"
                data-answer="${escapeHtml(option.term)}"
                ${state.locked ? "disabled" : ""}
              >
                <span class="button-eyebrow">${index + 1}</span>
                <span class="button-main">${escapeHtml(option.term || "Untitled")}</span>
              </button>
            `).join("")}
          </div>

          <div class="study-feedback ${state.wrongTerm ? "is-wrong" : ""} ${state.correctTerm && !state.wrongTerm ? "is-correct" : ""}">
            ${escapeHtml(state.feedback)}
          </div>
        </section>
      </main>
    `;

    const studyPanel = app.querySelector(".study-panel--draggable");
    makeDraggable(studyPanel, ".study-drag-handle", state.panel);

    app.querySelector("#study-back").addEventListener("click", () => {
      playSound("ui_select");
      window.onkeydown = null;
      goTo("deckLibrary");
    });

    app.querySelectorAll(".study-answer-button").forEach((button) => {
      button.addEventListener("click", () => {
        chooseAnswer(button.dataset.answer);
      });
    });

    window.onkeydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        window.onkeydown = null;
        goTo("deckLibrary");
        return;
      }

      const number = Number(event.key);

      if (Number.isInteger(number) && number >= 1 && number <= 4) {
        const option = options[number - 1];

        if (option) {
          event.preventDefault();
          chooseAnswer(option.term);
        }
      }
    };
  }

  render();
}

function makeDraggable(element, handleSelector, positionStore) {
  if (!element) return;

  const handle = element.querySelector(handleSelector) || element;

  let dragging = false;
  let startX = 0;
  let startY = 0;
  let originalX = 0;
  let originalY = 0;

  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    if (event.target.closest("button, input, textarea, select, a")) return;

    dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    originalX = positionStore.x;
    originalY = positionStore.y;

    handle.setPointerCapture(event.pointerId);
    element.classList.add("is-dragging");
  });

handle.addEventListener("pointermove", (event) => {
  if (!dragging) return;

  const rawX = originalX + event.clientX - startX;
  const rawY = originalY + event.clientY - startY;

  const parent = element.closest(".study-screen") || element.parentElement;
  const boundsWidth = parent ? parent.clientWidth : window.innerWidth;
  const boundsHeight = parent ? parent.clientHeight : window.innerHeight;

  const elementWidth = element.offsetWidth;
  const elementHeight = element.offsetHeight;

  const maxX = Math.max(0, boundsWidth - elementWidth);
  const maxY = Math.max(0, boundsHeight - elementHeight);

  positionStore.x = Math.min(Math.max(0, rawX), maxX);
  positionStore.y = Math.min(Math.max(0, rawY), maxY);

  element.style.transform = `translate(${positionStore.x}px, ${positionStore.y}px)`;
});

  handle.addEventListener("pointerup", (event) => {
    dragging = false;
    element.classList.remove("is-dragging");

    try {
      handle.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be gone. Browser whatnot.
    }
  });
}

function buildAnswerOptions(cards, currentIndex) {
  const current = cards[currentIndex];
  if (!current) return [];

  const options = [current];

  for (const card of cards) {
    if (options.length >= 4) break;
    if (card.id !== current.id) {
      options.push(card);
    }
  }

  return shuffle(options);
}

function answerClass(term, state) {
  if (!state.locked) return "";

  if (term === state.correctTerm) return "is-correct";
  if (term === state.wrongTerm) return "is-wrong";

  return "";
}

function renderCompletion(app, goTo, studyDeck, state) {
  playSound("finish");
  window.onkeydown = null;

  const total = studyDeck.cards.length;
  const accuracy = total > 0
    ? Math.round((state.correct / total) * 100)
    : 0;

  app.innerHTML = `
    <main class="study-screen study-screen--custom-bg">
      <section class="study-panel">
        <div class="completion-card">
          <p class="kicker">Session Complete</p>
          <h1>Set complete!</h1>
          <p>You reviewed ${state.reviewed}/${total} cards.</p>

          <div class="completion-stats">
            <p><strong>Correct:</strong> ${state.correct}</p>
            <p><strong>Incorrect:</strong> ${state.incorrect}</p>
            <p><strong>Accuracy:</strong> ${accuracy}%</p>
          </div>

          <div class="study-actions">
            <button class="menu-button" id="study-again" type="button">
              <span class="button-eyebrow">Repeat</span>
              <span class="button-main">Study Again</span>
            </button>

            <button class="menu-button" id="back-to-decks" type="button">
              <span class="button-eyebrow">Return</span>
              <span class="button-main">Back to Deck Library</span>
            </button>
          </div>
        </div>
      </section>
    </main>
  `;

  app.querySelector("#study-again").addEventListener("click", () => {
    playSound("ui_select");
    runStudySession(app, goTo, studyDeck);
  });

  app.querySelector("#back-to-decks").addEventListener("click", () => {
    playSound("ui_select");
    goTo("deckLibrary");
  });
}

function renderLoading(app, goTo) {
  app.innerHTML = `
    <main class="study-screen study-screen--custom-bg">
      <section class="study-panel">
        <header class="study-header">
          <div>
            <p class="kicker">Study Mode</p>
            <h1>Loading deck...</h1>
          </div>

          <button class="menu-button back-button" id="study-back" type="button">
            <span class="button-eyebrow">Return</span>
            <span class="button-main">Deck Library</span>
          </button>
        </header>

        <div class="loading-state">
          <p>Opening the study chamber...</p>
        </div>
      </section>
    </main>
  `;

  app.querySelector("#study-back").addEventListener("click", () => {
    playSound("ui_select");
    goTo("deckLibrary");
  });
}

function renderStudyError(app, goTo, error) {
  window.onkeydown = null;

  app.innerHTML = `
    <main class="study-screen study-screen--custom-bg">
      <section class="study-panel">
        <header class="study-header">
          <div>
            <p class="kicker">Study Mode</p>
            <h1>Could not load deck</h1>
          </div>

          <button class="menu-button back-button" id="study-back" type="button">
            <span class="button-eyebrow">Return</span>
            <span class="button-main">Deck Library</span>
          </button>
        </header>

        <div class="error-state">
          <p class="error-message">Deck Load Failed</p>
          <code>${escapeHtml(error?.message || "Unknown error")}</code>
        </div>
      </section>
    </main>
  `;

  app.querySelector("#study-back").addEventListener("click", () => {
    playSound("ui_select");
    goTo("deckLibrary");
  });
}

function renderEmptyStudyDeck(app, goTo, studyDeck) {
  window.onkeydown = null;

  app.innerHTML = `
    <main class="study-screen study-screen--custom-bg">
      <section class="study-panel">
        <header class="study-header">
          <div>
            <p class="kicker">Study Mode</p>
            <h1>${escapeHtml(studyDeck.title)}</h1>
          </div>

          <button class="menu-button back-button" id="study-back" type="button">
            <span class="button-eyebrow">Return</span>
            <span class="button-main">Deck Library</span>
          </button>
        </header>

        <div class="empty-state">
          <p>This deck has no studyable cards.</p>
        </div>
      </section>
    </main>
  `;

  app.querySelector("#study-back").addEventListener("click", () => {
    playSound("ui_select");
    goTo("deckLibrary");
  });
}

function normalizeStudyDeck(raw) {
  if (raw?.schema_version === 1 && raw.deck) {
    return {
      title: raw.deck.title || "Untitled Deck",
      cards: Array.isArray(raw.cards)
        ? raw.cards.map(normalizeMflashCard).filter(isStudyableCard)
        : [],
    };
  }

  return {
    title: raw?.name || "Untitled Deck",
    cards: Array.isArray(raw?.cards)
      ? raw.cards.map(normalizeLegacyCard).filter(isStudyableCard)
      : [],
  };
}

function normalizeMflashCard(card) {
  return {
    id: card.id || "",
    term: String(card.term || ""),
    definition: String(card.definition || ""),
    exampleSentences: Array.isArray(card.example_sentences)
      ? card.example_sentences
      : [],
    tags: Array.isArray(card.tags) ? card.tags : [],
    media: isPlainObject(card.media) ? card.media : null,
  };
}

function normalizeLegacyCard(card) {
  return {
    id: card.id || "",
    term: String(card.front || card.term || ""),
    definition: String(card.back || card.definition || ""),
    exampleSentences: Array.isArray(card.metadata?.examples)
      ? card.metadata.examples
      : [],
    tags: Array.isArray(card.tags) ? card.tags : [],
    media: isPlainObject(card.metadata?.media)
      ? card.metadata.media
      : mediaFromPath(card.metadata?.mediaPath),
  };
}

function mediaFromPath(path) {
  if (typeof path !== "string" || !path.trim()) return null;

  return {
    type: "file",
    path: path.trim(),
    alt: "",
  };
}

function isStudyableCard(card) {
  return card.term.trim() || card.definition.trim();
}

function shuffle(items) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
