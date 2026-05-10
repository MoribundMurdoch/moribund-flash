# `src/screens/study.js`

`study.js` controls the Study Mode screen.

It is responsible for loading a deck, turning that deck into studyable cards, showing the current card, creating answer buttons, checking whether the answer is correct, playing feedback sounds, tracking progress, showing a completion screen, and spawning a draggable media window when a card has attached media.

### In Short:

* Deck Library click
* → `loadDeck()`
* → Normalize deck data
* → Render study session
* → Answer card
* → Show feedback
* → Advance card
* → Finish session

---

## Imports

```javascript
import { loadDeck } from "../api.js";
import { playSound } from "../sound.js";

```

* `loadDeck()` comes from `src/api.js`. It talks to the Rust backend through Tauri and loads a saved deck.
* `playSound()` comes from `src/sound.js`. It plays UI sounds like correct, wrong, finish, and button select.

> **Warning:** Do not casually add bare imports like:
> ```javascript
> import { something } from "@tauri-apps/api/core";
> 
> ```
> 
> 
> unless the frontend is bundled correctly. This project currently loads frontend files directly, so a bad bare import can black-screen the whole app. Tiny import goblin, massive damage.

---

## Main Entry Point

```javascript
export async function renderStudy(app, { goTo, data }) {

```

This is the function `main.js` calls when routing to the Study screen. It receives:

* `app` = the main DOM container, usually `#app`
* `goTo` = route-changing function from `main.js`
* `data` = route data, such as `deckPath` or an already-loaded deck

The function first pulls out either a deck path or a provided deck:

```javascript
const deckPath = data?.deckPath ?? null;
const providedDeck = data?.deck ?? null;

```

Then it renders a loading state:

```javascript
renderLoading(app, goTo);

```

Then it tries to load the deck:

```javascript
const deck = providedDeck || await loadDeck({ path: deckPath });
const studyDeck = normalizeStudyDeck(deck);
runStudySession(app, goTo, studyDeck);

```

**The exact flow is:**
Show loading screen → load deck → normalize it → start study session.

If loading fails, it shows an error screen:

```javascript
renderStudyError(app, goTo, error);

```

---

## Session State

Inside `runStudySession()`, the file creates a state object:

```javascript
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
    x: 32,
    y: 32,
  },
  mediaPanel: {
    x: 40,
    y: 40,
  },
};

```

This is the temporary state for the current study session. What each field means:

* **`cardIndex`**: Which card is currently being studied
* **`reviewed`**: How many cards have been completed
* **`correct`**: Correct answer count
* **`incorrect`**: Wrong answer count
* **`selectedTerm`**: The answer the user picked
* **`correctTerm`**: The correct answer for highlighting
* **`wrongTerm`**: The wrong answer for highlighting
* **`feedback`**: Text like "Correct!" or "Wrong..."
* **`locked`**: Prevents double-answering during feedback delay
* **`panel`**: X/Y position of the draggable study panel
* **`mediaPanel`**: X/Y position of the draggable media window

**The important idea:** This state is not saved permanently. It only exists while the study session is running.

---

## Empty Deck Handling

```javascript
if (!studyDeck.cards.length) {
  renderEmptyStudyDeck(app, goTo, studyDeck);
  return;
}

```

If the deck has no usable cards, Study Mode does not crash. It shows an empty-state screen instead. A “usable” card means it has at least a term or a definition.

---

## Getting the Current Card

```javascript
function currentCard() {
  return studyDeck.cards[state.cardIndex] ?? null;
}

```

This returns the current card based on `state.cardIndex`.

---

## Building Answer Options

```javascript
function currentOptions() {
  return buildAnswerOptions(studyDeck.cards, state.cardIndex);
}

```

The answer options are generated from the current card plus distractors from the rest of the deck. The current `buildAnswerOptions()` function does this:

1. Add the current card.
2. Add up to 3 other cards.
3. Shuffle them.

That means a deck with only one card will only have one answer button. For proper multiple choice, the deck needs at least 4 cards.

---

## Choosing an Answer

```javascript
function chooseAnswer(term) {

```

This handles what happens when the user clicks an answer button or presses number keys 1–4. First it prevents double-click weirdness:

```javascript
if (state.locked) return;

```

Then it gets the current card:

```javascript
const card = currentCard();
if (!card) return;

```

Then it checks correctness:

```javascript
const wasCorrect = term === card.term;

```

If the chosen term matches the current card’s term, the answer is correct. The state is updated for highlighting and feedback:

```javascript
state.selectedTerm = term;
state.correctTerm = card.term;
state.wrongTerm = wasCorrect ? null : term;
state.feedback = wasCorrect
  ? "Correct!"
  : `Wrong. The correct answer was “${card.term}.”`;
state.locked = true;

```

Then it updates the score and plays the correct sound:

```javascript
if (wasCorrect) {
  state.correct += 1;
  playSound("correct");
} else {
  state.incorrect += 1;
  playSound("wrong");
}

```

Then it re-renders the screen so the user sees the green/red feedback. After a short delay, it advances:

```javascript
window.setTimeout(() => {
  state.reviewed += 1;

  if (state.reviewed >= studyDeck.cards.length) {
    renderCompletion(app, goTo, studyDeck, state);
    return;
  }

  state.cardIndex += 1;
  // ...
  render();
}, 800);

```

**Answer flow:**
User picks answer → lock card → mark correct/wrong → play sound → show feedback → wait 800ms → move to next card or completion screen.

---

## Rendering the Study Screen

The inner `render()` function rebuilds the Study screen HTML. It calculates:

```javascript
const card = currentCard();
const options = currentOptions();
const progress = studyDeck.cards.length
  ? state.reviewed / studyDeck.cards.length
  : 0;

```

Then it writes a full screen into `app.innerHTML`. The main wrapper is:

```html
<main class="study-screen study-screen--custom-bg">

```

This is the whole Study Mode canvas. The draggable study module is:

```html
<section
  class="study-panel study-panel--draggable"
  style="transform: translate(${state.panel.x}px, ${state.panel.y}px);"
>

```

That transform is what moves the whole study panel around. The drag handle is the header:

```html
<header class="study-header study-drag-handle">

```

So the user can drag the whole study module by grabbing the top header area.

---

## UI Components

### Progress Bar

The progress bar is rendered like this:

```html
<div class="study-progress-bar">
  <div class="study-progress-bar__fill" style="width: ...%"></div>
</div>

```

The width is based on `Math.round(progress * 100)`. So if the user has reviewed 2 out of 4 cards, the progress bar is 50%.

### Definition Card

The definition shown to the user is:

```javascript
card.definition || "No definition provided."

```

This makes the Study Mode definition-first:
Show definition → user chooses matching term.
*(That matches the older MorFlash study behavior.)*

### Answer Buttons

Answer buttons are created from `options.map(...)`. Each button gets `data-answer="..."`. That value is read later when the user clicks:

```javascript
chooseAnswer(button.dataset.answer);

```

The button class includes `answerClass(option.term, state)`. That function decides whether a button should be highlighted as correct or wrong.

### Correct/Wrong Highlighting

```javascript
function answerClass(term, state) {
  if (!state.locked) return "";

  if (term === state.correctTerm) return "is-correct";
  if (term === state.wrongTerm) return "is-wrong";

  return "";
}

```

* Before an answer is chosen, buttons have no feedback class.
* After an answer is chosen:
* Correct answer button -> `is-correct`
* Wrong selected button -> `is-wrong`



The colors are handled in `src/styles/study.css`.

---

## Keyboard Shortcuts

The Study screen uses:

```javascript
window.onkeydown = (event) => {

```

Supported keys:

* **Escape** = return to Deck Library
* **1** = choose first answer
* **2** = choose second answer
* **3** = choose third answer
* **4** = choose fourth answer

This block turns keyboard numbers into answer button choices:

```javascript
const number = Number(event.key);

if (Number.isInteger(number) && number >= 1 && number <= 4) {
  const option = options[number - 1];

  if (option) {
    event.preventDefault();
    chooseAnswer(option.term);
  }
}

```

---

## Draggability

### Draggable Study Panel

The study panel becomes draggable here:

```javascript
const studyPanel = app.querySelector(".study-panel--draggable");
makeDraggable(studyPanel, ".study-drag-handle", state.panel);

```

The draggable function needs:

* `element` = thing that moves (`.study-panel--draggable`)
* `handleSelector` = part the user grabs (`.study-drag-handle`)
* `positionStore` = object that remembers x/y position (`state.panel`)

When the user drags the header, `state.panel.x` and `state.panel.y` are updated.

### Drag Clamping

Inside `makeDraggable()`, the position is clamped to prevent dragging off-screen:

```javascript
positionStore.x = clamp(rawX, 0, maxX);
positionStore.y = clamp(rawY, 0, maxY);

```

The maximum positions are based on the study canvas size minus the panel size:

```javascript
const maxX = Math.max(0, canvasWidth - panelWidth);
const maxY = Math.max(0, canvasHeight - panelHeight);

```

The helper function:

```javascript
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

```

*(If the value is too small, use min. If too big, use max. Otherwise, use value.)*

> **Known goblin:** Drag math depends heavily on CSS. If `.study-panel` is margin-centered or in normal flow, dragging can feel haunted. The clean version is for the draggable panel to act like an absolutely positioned window inside `.study-screen`.

---

## Media Handling

### Media Window

If a card has media, this line renders a media window:

```javascript
${card.media ? renderMediaWindow(card.media, state.mediaPanel) : ""}

```

The media window is separate from the main study panel:

```html
<aside class="study-media-window">

```

It has its own titlebar and is made draggable with its own coordinate state (`state.mediaPanel`):

```javascript
const mediaPanel = app.querySelector(".study-media-window");
makeDraggable(mediaPanel, ".study-media-window__titlebar", state.mediaPanel);

```

### Media Rendering

The file supports various media types in `renderMediaElement(type, src, alt)`:

* `image` -> `<img>`
* `video` -> `<video controls>`
* `audio` -> `<audio controls>`
* `file` -> fallback path display

Images render like this:

```html
  <img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}" draggable="false">
  <code>${escapeHtml(src)}</code>

```

*(The `<code>` display is a debugging helper. Once media loading is stable, that debug line can be removed.)*

### Local Media Paths

```javascript
function mediaSrc(path) {

```

Turns a stored media path into something the webview can load. If the path is already a web-safe URL, it returns it. Otherwise, it tries Tauri’s asset converter:

```javascript
return window.__TAURI__?.core?.convertFileSrc
  ? window.__TAURI__.core.convertFileSrc(path)
  : path;

```

This avoids a risky bare import from `@tauri-apps/api/core`.

> **Known goblin:** Local media display depends on Tauri’s asset protocol and config. If the media window spawns but the image is broken, check:
> * Does `media.path` point to a real file?
> * Is Tauri `assetProtocol` enabled?
> * Is the asset protocol scope wide enough?
> * Is CSP blocking asset URLs?
> * Is `mediaSrc()` producing a raw `/home/...` path or an `asset://` URL?
> 
> 

---

## Screen States

### Completion Screen

Runs when every card has been reviewed:

```javascript
renderCompletion(app, goTo, studyDeck, state);

```

Displays session complete, reviewed count, correct/incorrect count, accuracy, and options to "Study Again" or go "Back to Deck Library". It also plays the finish sound.

Accuracy calculation:

```javascript
const accuracy = total > 0
  ? Math.round((state.correct / total) * 100)
  : 0;

```

### Loading Screen

Before the deck loads, `renderLoading()` gives the app something visible while waiting for Rust to return the data.

### Error Screen

If deck loading fails, `renderStudyError()` shows an error message. Useful for Rust command failures, wrong deck paths, or JSON parsing breaks.

### Empty Deck Screen

If the deck loads but has no studyable cards, `renderEmptyStudyDeck()` explains that to the user.

---

## Normalization & Data Formatting

The Study screen does not trust raw deck data. It normalizes it first.

### Normalizing Decks

```javascript
function normalizeStudyDeck(raw) {

```

It supports two shapes:

1. **`.mflash` v1 shape**: Checks for `schema_version === 1` and uses `raw.deck.title` and `raw.cards`.
2. **Legacy front/back shape**: Uses `raw.name` and `raw.cards`.

### Normalizing Cards

```javascript
function normalizeMflashCard(card) {

```

Converts `.mflash` fields (`term`, `definition`, `example_sentences`, `tags`, `media`) into the shape Study Mode expects.

```javascript
function normalizeLegacyCard(card) {

```

Supports old names so older decks still work (`front` -> `term`, `back` -> `definition`, `metadata.examples` -> `exampleSentences`, etc.).

### Studyable Card Filter

```javascript
function isStudyableCard(card) {
  return card.term.trim() || card.definition.trim();
}

```

Prevents totally empty cards from appearing.

### Shuffle

```javascript
function shuffle(items) {

```

Randomizes the answer options using a Fisher-Yates style shuffle so the correct answer is not always first.

### Escaping HTML

The file uses `escapeHtml()` and `escapeAttribute()` to prevent user-entered deck/card text from being treated as executable HTML code (e.g., `<script>evil()</script>`).

---

## Main Mental Model

Think of `study.js` as four layers:

1. **Load layer**: `renderStudy()`, `loadDeck()`
2. **Data layer**: `normalizeStudyDeck()`, `normalizeMflashCard()`, `normalizeLegacyCard()`
3. **Session layer**: `runStudySession()`, `chooseAnswer()`, `state` object
4. **UI layer**: `render()`, `renderMediaWindow()`, `renderCompletion()`, `renderLoading()`, `renderStudyError()`

---

## What to Be Careful With

1. **Bad imports can black-screen the app**
Because `main.js` imports `study.js`, any top-level import error in `study.js` stops the app from booting.
* **Danger zone:** `import { convertFileSrc } from "@tauri-apps/api/core";`
* **Safer approach:** `window.__TAURI__?.core?.convertFileSrc`


2. **Drag math depends on CSS**
The drag code assumes the panel is moving inside `.study-screen`. Check `src/styles/study.css` and `src/styles.css`. Duplicate old rules can override the clean screen-specific CSS and cause invisible barriers.
3. **Media loading depends on Tauri config**
Even with correct paths, the webview may not load local files unless configured. Check `src-tauri/tauri.conf.json` for `"assetProtocol": { "enable": true, "scope": [...] }`.
4. **One-card decks make bad multiple-choice quizzes**
Without distractors, the answer grid shows one option. Use at least four cards for proper testing.

---

## Quick Debugging Checklist

If Study Mode breaks, check:

* [ ] Does the app boot?
* [ ] Does DevTools show a JavaScript error?
* [ ] Does `node --check src/screens/study.js` pass?
* [ ] Does Deck Library route to `study`?
* [ ] Does `loadDeck()` return cards?
* [ ] Does `normalizeStudyDeck()` keep those cards?
* [ ] Does a card have a term and definition?
* [ ] Does a media card have `media.path`?
* [ ] Does the media file exist on disk?
* [ ] Is the media URL raw `/home/...` or `asset://` / `[http://asset.localhost](http://asset.localhost)`?
* [ ] Are old study CSS rules overriding `study.css`?

---

## Summary

`study.js` is the Study Mode controller. It loads a deck, converts it into a predictable study format, shows a definition-first multiple-choice card, checks answers, plays feedback sounds, tracks progress, and finishes the session. It also handles draggable UI behavior and card media windows.

Most bugs in this file come from one of three places:

1. Data normalization dropped something
2. CSS changed the drag coordinate system
3. Tauri/local media paths are not webview-loadable

Very normal goblins. Not elegant goblins, but normal ones.

```

```