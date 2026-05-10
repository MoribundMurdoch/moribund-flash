# `src/screens/deckBuilder.js`

`deckBuilder.js` controls the Deck Builder screen.

It is responsible for creating and editing decks, managing draft state, switching between cards, saving `.mflash` decks, attaching media, importing media through Tauri, and rendering the full Deck Builder interface.

In short:

```text
Deck Builder screen
→ edit deck metadata
→ edit card fields
→ attach media
→ save local draft
→ export/save .mflash deck
````

## Imports

```js
import { importMediaFile, pickMediaFile, saveDeck } from "../api.js";
```

This file talks to the rest of the app through `src/api.js`.

It imports:

```text
saveDeck()        = sends the finished .mflash deck to Rust for saving
pickMediaFile()   = asks Rust/Tauri to open a native media file picker
importMediaFile() = asks Rust/Tauri to copy a media file into app storage
```

Important idea: Deck Builder does **not** call Rust directly. It goes through `api.js`, which acts as the frontend firewall.

## Draft key

```js
const DRAFT_KEY = "moribundFlash.deckBuilderDraft.v2";
```

This is the localStorage key used for saving the unfinished builder draft.

If the user leaves the Deck Builder and comes back later, the app can restore their unfinished work from localStorage.

The `v2` part matters. If the draft format changes later, a new key like `v3` can avoid loading old incompatible draft data.

## Card IDs

```js
function makeId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `card-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
```

Each card needs an ID.

The preferred method is:

```js
crypto.randomUUID()
```

If that is unavailable, it falls back to a timestamp plus random hex.

This is not sacred database architecture. It is just enough identity so cards can be tracked and exported.

## Empty card shape

```js
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
```

This defines the builder’s internal card shape.

A card in the builder has:

```text
id           = unique card ID
term         = the answer/term side
definition   = the prompt/definition side
termLang     = language for the term
defLang      = language for the definition
hyperlink    = optional link
mediaPath    = optional attached media path
tagsText     = comma-separated tags
examplesText = one example sentence per line
```

This is **builder state**, not final `.mflash` format.

The builder uses text-friendly fields like `tagsText` and `examplesText` because they are easier to edit in input boxes and textareas.

## Empty builder state

```js
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
```

The whole Deck Builder screen is controlled by `builderState`.

It stores:

```text
fileName    = deck title / file name basis
tagsText    = deck-level comma-separated tags
mediaPath   = deck-level cover/media path
cards       = list of builder cards
activeIndex = which card is currently being edited
searchText  = sidebar search query
status      = success/status message
error       = error message
```

The default state always starts with one blank card.

That prevents the editor from having to deal with “zero cards exist” every five seconds like a raccoon gnawing on the floorboards.

## Global builder state

```js
let builderState = loadDraft();
```

When the module loads, it tries to load an existing draft.

If no draft exists, it starts from `emptyState()`.

This means the Deck Builder screen has persistent draft behavior.

## Loading drafts

```js
function loadDraft() {
```

This function tries to read the saved draft from localStorage.

The basic flow:

```text
read localStorage
→ parse JSON
→ make sure there is at least one card
→ merge parsed draft with empty defaults
→ clamp activeIndex
→ clear status/error
```

Important line:

```js
const cards = Array.isArray(parsed.cards) && parsed.cards.length > 0
  ? parsed.cards
  : [emptyCard()];
```

This prevents the builder from loading a broken draft with no cards.

Another important line:

```js
activeIndex: clampIndex(parsed.activeIndex ?? 0, cards.length)
```

This keeps `activeIndex` inside the valid card range.

If loading fails, the catch block returns a fresh empty state:

```js
catch {
  return emptyState();
}
```

So a corrupted draft should not crash the whole builder.

## Saving drafts

```js
function saveDraft() {
```

This stores the current builder draft in localStorage.

It saves:

```text
fileName
tagsText
mediaPath
cards
activeIndex
searchText
```

It does **not** save temporary UI messages like `status` and `error`.

That is intentional. A stale “Saved!” or old error message should not haunt the user next time they open the builder.

## Clearing drafts

```js
function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}
```

This deletes the local draft.

It is used when saving and exiting after a successful save.

## Clamping card index

```js
function clampIndex(index, length) {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(Number(index) || 0, length - 1));
}
```

This makes sure the selected card index stays valid.

Examples:

```text
clampIndex(-1, 5)  -> 0
clampIndex(99, 5)  -> 4
clampIndex(2, 5)   -> 2
```

This protects card navigation after deletion, duplication, or loading drafts.

## Getting the active card

```js
function activeCard() {
```

This returns the card currently being edited.

It also repairs the state if the cards list is empty:

```js
if (!builderState.cards.length) {
  builderState.cards.push(emptyCard());
  builderState.activeIndex = 0;
}
```

So any part of the editor can safely call `activeCard()` and expect a real card back.

## Splitting tags and examples

```js
function splitCommaList(value) {
```

Turns comma-separated text into an array:

```text
"language, vocabulary, chapter-1"
→ ["language", "vocabulary", "chapter-1"]
```

```js
function splitLines(value) {
```

Turns textarea lines into an array:

```text
"Example one.\nExample two."
→ ["Example one.", "Example two."]
```

These are used when converting builder state into `.mflash`.

## Supported media paths

```js
function isSupportedMediaPath(path) {
```

This accepts files ending in:

```text
images: png, jpg, jpeg, gif, webp, svg
video:  mp4, webm, mov, m4v
audio:  ogg, mp3, wav
```

This is a simple extension check. It does not inspect the actual file contents.

Good enough for builder validation. Not a forensic lab. No tiny CSI episode.

## Media type detection

```js
function mediaTypeFromPath(path) {
```

This guesses the media type from the file extension.

It returns:

```text
image
video
audio
file
```

That type later becomes part of the `.mflash` media object.

Example:

```js
mediaTypeFromPath("/somewhere/cat.gif")
```

returns:

```text
image
```

A GIF is treated as image because the study screen can display it with `<img>`.

## Browser file path fallback

```js
function filePathFromFile(file) {
```

This tries to get a path from a browser `File` object:

```js
file?.path || file?.webkitRelativePath || file?.name || ""
```

Known goblin: browser drag/drop often does **not** expose a full local path. It may only expose a filename.

That is why the native Tauri media picker/importer is the better long-term path.

## Importing media into app storage

```js
async function attachImportedMediaPath(sourcePath, target) {
```

This is the stable media path function.

It calls:

```js
const imported = await importMediaFile(sourcePath);
```

That asks Rust to copy the source media file into the app’s own media folder.

Then it reads:

```js
const storedPath = imported?.stored_path || imported?.storedPath;
```

This supports both snake_case and camelCase result shapes.

If Rust returns a valid stored path, it writes it into either:

```text
builderState.mediaPath       = deck-level media
activeCard().mediaPath       = card-level media
```

The target decides where the media goes:

```js
if (target === "deck") {
```

or:

```js
if (target === "card") {
```

A successful deck import sets:

```js
builderState.mediaPath = storedPath;
```

A successful card import sets:

```js
const card = activeCard();
card.mediaPath = storedPath;
```

This matters because `.mflash` export later reads `mediaPath`.

## Attaching a dropped or selected media file

```js
async function attachMediaFile(file, target) {
```

This handles a browser `File` object.

It checks:

```text
[ ] Did the user actually select/drop a file?
[ ] Can we get a path/name from it?
[ ] Is the extension supported?
[ ] Can Rust import/copy it?
```

If all checks pass, it calls:

```js
await attachImportedMediaPath(path, target);
```

Known goblin: if the file object only gives `file.name`, Rust may not be able to copy it because it is not a real path. The Browse button is more reliable because it uses the native Tauri file picker.

## Native media browse

```js
async function browseAndImportMedia(target) {
```

This is the better media import flow.

It calls:

```js
const sourcePath = await pickMediaFile();
```

That opens a native file picker through Rust/Tauri.

If the user picks a file, it imports it:

```js
await attachImportedMediaPath(sourcePath, target);
```

Use this path when you want durable media support.

## Handling media drop

```js
async function handleMediaDrop(event, target) {
```

This handles files dragged onto the media drop zone.

It does:

```js
event.preventDefault();
event.stopPropagation();
```

Then grabs the first dropped file:

```js
const file = event.dataTransfer?.files?.[0];
```

Then tries to import it:

```js
await attachMediaFile(file, target);
```

Again, drag/drop may or may not expose a real usable path depending on WebView/browser behavior.

## Preventing default drag behavior

```js
function preventMediaDragDefault(event) {
  event.preventDefault();
  event.stopPropagation();
}
```

Without this, the browser/webview may try to open the dropped image or file instead of letting the app handle it.

Very rude. We prevent that.

## Deck name

```js
function deckName() {
  const trimmed = String(builderState.fileName || "").trim();
  return trimmed || "new_deck";
}
```

This returns the deck title/file name base.

If the user does not provide one, it uses:

```text
new_deck
```

## Escaping HTML

```js
function escapeHtml(value) {
```

This prevents user-entered text from becoming real HTML in the rendered interface.

For example:

```html
<script>alert("goblin")</script>
```

becomes harmless visible text.

Any time builder state is inserted into template HTML, it should be escaped.

## Card titles in the sidebar

```js
function cardTitle(card, index) {
```

The sidebar needs a readable title for each card.

Priority:

```text
1. term
2. first 32 characters of definition
3. Untitled card N
```

So even blank-ish cards still get a sidebar label.

## Card subtitles in the sidebar

```js
function cardSubtitle(card) {
```

The subtitle shows extra context under each card title.

Priority:

```text
term language + tags
term language
tags
No details yet
```

This makes the card list easier to scan.

## Filtering cards

```js
function filteredCards() {
```

This powers the sidebar search.

It searches across:

```text
term
definition
termLang
defLang
tagsText
examplesText
```

It returns objects shaped like:

```js
{ card, index }
```

The `index` is important because filtered search results still need to point back to the real card in `builderState.cards`.

## Setting deck fields

```js
function setDeckField(field, value) {
```

This updates deck-level fields like:

```text
fileName
tagsText
mediaPath
searchText
```

It also clears messages:

```js
builderState.status = "";
builderState.error = "";
```

Then saves the draft.

## Setting active card fields

```js
function setActiveCardField(field, value) {
```

This updates the currently selected card.

Examples:

```text
term
definition
termLang
defLang
hyperlink
mediaPath
tagsText
examplesText
```

It also clears messages and saves the draft.

## Adding a card

```js
function addCard() {
```

This creates a new blank card, pushes it into the deck, and selects it.

It also sets:

```js
builderState.status = "New card added.";
```

## Duplicating a card

```js
function duplicateActiveCard() {
```

This copies the active card and gives the copy a new ID:

```js
const copy = {
  ...card,
  id: makeId(),
};
```

Then it inserts the copy after the current card and selects the copy.

Useful for cards that have similar terms, tags, languages, or media.

## Removing a card

```js
function removeActiveCard() {
```

If there is only one card, it does not leave the deck empty. It resets to one blank card:

```js
builderState.cards = [emptyCard()];
builderState.activeIndex = 0;
```

If there are multiple cards, it removes the active one and clamps the selected index.

## Previous / next card

```js
function goPreviousCard()
function goNextCard()
```

These move the active index backward or forward, then save the draft.

They use `clampIndex()`, so they cannot go outside the card list.

## Creating a media object

```js
function mediaFromPath(path) {
```

This converts a plain path string into a `.mflash` media object:

```js
{
  type: mediaTypeFromPath(trimmed),
  path: trimmed,
  alt: "",
}
```

If there is no path, it returns:

```js
null
```

So final `.mflash` cards get either:

```json
"media": null
```

or:

```json
"media": {
  "type": "image",
  "path": "...",
  "alt": ""
}
```

## Converting builder state to `.mflash`

```js
function builderStateToDeck() {
```

This is one of the most important functions in the file.

It converts the editor-friendly builder state into clean `.mflash` version 1.

The output shape is:

```js
{
  schema_version: 1,
  deck: { ... },
  cards: [ ... ]
}
```

Deck metadata becomes:

```js
deck: {
  id,
  title,
  description,
  tags,
  media,
  notes,
  source_id,
  extra_fields,
}
```

Cards become:

```js
{
  id,
  term,
  definition,
  term_language,
  definition_language,
  example_sentences,
  tags,
  media,
  hyperlink,
  notes,
  source_id,
  extra_fields,
}
```

Important conversions:

```text
builderState.fileName       -> deck.title
builderState.tagsText       -> deck.tags array
builderState.mediaPath      -> deck.media
card.termLang               -> term_language
card.defLang                -> definition_language
card.examplesText           -> example_sentences array
card.tagsText               -> tags array
card.mediaPath              -> media
```

It filters cards before exporting:

```js
.filter((card) => card.term.trim() || card.definition.trim())
```

That means totally blank cards do not get saved into the deck.

## Saving the deck

```js
async function saveBuilderDeck({ exitAfterSave = false } = {}) {
```

This creates the final `.mflash` object and sends it to Rust through `saveDeck()`.

Flow:

```text
clear status/error
→ convert builder state to .mflash
→ reject if no cards
→ call saveDeck(deck)
→ show success message
→ save or clear draft
```

If the deck has no cards:

```js
builderState.error = "Add at least one card before saving.";
```

On success:

```js
builderState.status = `Saved "${deck.deck.title}".`;
```

If `exitAfterSave` is true, it clears the draft and resets the state.

Currently normal “Save Deck” uses `exitAfterSave = false`, so the draft remains available.

## Rendering the sidebar

```js
function renderSidebar() {
```

The sidebar contains:

```text
Deck Structure
card count
Add Card button
Search input
card navigation list
```

Each card nav button has:

```html
data-action="select-card"
data-index="..."
```

The click handler later uses those attributes to select the card.

## Rendering deck metadata

```js
function renderMetadata() {
```

This renders deck-level fields:

```text
Deck Title
Deck Tags
Cover / Media
```

The deck media field supports:

```text
drop image/GIF/video/audio
browse with native picker
paste path manually
```

The deck media drop zone has:

```html
data-media-drop="deck"
```

The Browse button has:

```html
data-action="browse-deck-media"
```

The hidden file picker has:

```html
data-media-picker="deck"
```

Even though the native Tauri picker is now preferred, the hidden browser picker still exists as fallback plumbing.

## Rendering the active card editor

```js
function renderActiveCardEditor() {
```

This renders the main editor for the currently selected card.

It includes:

```text
Editing Card N of total
Duplicate button
Remove button
Term section
Definition section
Media section
Tags
Example Sentences
Previous / Next buttons
```

The card media zone supports:

```text
drop media
browse media
paste path
```

The card media drop zone uses:

```html
data-media-drop="card"
```

The Browse button uses:

```html
data-action="browse-card-media"
```

The hidden file picker uses:

```html
data-media-picker="card"
```

## Main render function

```js
function render(app, goTo) {
```

This function draws the entire Deck Builder screen into `app.innerHTML`.

It renders:

```text
topbar
sidebar
main editor area
metadata panel
active card editor
shortcut hint
status/error notices
```

Then it attaches all event listeners.

Important: this file uses a full re-render pattern. Many actions update `builderState`, call `saveDraft()`, and then call:

```js
render(app, goTo);
```

That means the DOM gets rebuilt often.

This is simple and easy to understand, but it means event listeners must be reattached after every render.

## Input event handling

```js
app.addEventListener("input", (event) => {
```

This listens for changes to deck fields and card fields.

Deck-level fields use:

```html
data-deck-field="fileName"
```

Card-level fields use:

```html
data-card-field="term"
```

The input handler checks those dataset attributes and calls either:

```js
setDeckField(...)
```

or:

```js
setActiveCardField(...)
```

If the changed deck field is `searchText`, the screen re-renders so filtered search results update immediately.

## Media drop listeners

```js
app.querySelectorAll("[data-media-drop]").forEach((zone) => {
```

Each media drop zone gets:

```text
dragover  -> prevent default and show drag-over style
dragleave -> remove drag-over style
drop      -> import dropped media and re-render
```

The drop handler calls:

```js
await handleMediaDrop(event, zone.dataset.mediaDrop);
```

The `data-media-drop` value tells the handler whether the media belongs to the deck or the active card.

## Media picker listeners

```js
app.querySelectorAll("[data-media-picker]").forEach((picker) => {
```

These are hidden `<input type="file">` elements.

When they change, the selected file is passed to:

```js
await attachMediaFile(file, picker.dataset.mediaPicker);
```

This is fallback behavior. The more reliable flow is the Browse button using the native Tauri picker.

## Click handler

```js
app.addEventListener("click", async (event) => {
```

The click handler uses event delegation.

It looks for:

```js
const button = event.target.closest("[data-action]");
```

Then it switches based on:

```js
const action = button.dataset.action;
```

Supported actions include:

```text
select-card
add-card
duplicate-active
remove-active
previous-card
next-card
browse-deck-media
browse-card-media
save-draft
save-deck
import-file
exit
```

This pattern keeps the HTML simple. Buttons declare what they do with `data-action`, and the JavaScript handles the behavior centrally.

## Browse deck media

```js
if (action === "browse-deck-media") {
  await browseAndImportMedia("deck");
  render(app, goTo);
  return;
}
```

This opens the native media picker and imports the selected file as deck-level media.

## Browse card media

```js
if (action === "browse-card-media") {
  await browseAndImportMedia("card");
  render(app, goTo);
  return;
}
```

This opens the native media picker and imports the selected file as active-card media.

This is the main path for adding images/GIFs/video/audio to individual flashcards.

## Save draft

```js
if (action === "save-draft") {
```

This saves the current builder state to localStorage.

It does not create a `.mflash` file.

Use this for temporary local work-in-progress.

## Save deck

```js
if (action === "save-deck") {
  await saveBuilderDeck();
  render(app, goTo);
  return;
}
```

This exports builder state into `.mflash` v1 and sends it to the Rust backend to save as a deck file.

## Import file

```js
if (action === "import-file") {
  builderState.error = "Import is not wired yet. Next stop: Tauri file picker.";
```

This button is still a placeholder.

The future version should probably use the ImportDeckDraft layer:

```text
raw imported file
→ ImportDeckDraft
→ warnings
→ builder state
→ user reviews/edits
→ save .mflash
```

## Exit

```js
if (action === "exit") {
  goTo("deckList");
}
```

This returns to the deck list.

Potential future improvement: maybe exit should go back to the main menu or ask about unsaved changes.

## Keyboard shortcuts

```js
app.addEventListener("keydown", async (event) => {
```

The builder supports:

```text
Ctrl+N       = add new card
Ctrl+D       = duplicate active card
Delete       = remove active card, only when not typing
ArrowLeft    = previous card, only when not typing
ArrowUp      = previous card, only when not typing
ArrowRight   = next card, only when not typing
ArrowDown    = next card, only when not typing
Alt+Arrow    = navigate even while typing
```

It checks whether the user is typing:

```js
const activeTag = document.activeElement?.tagName?.toLowerCase() || "";
const isTyping = activeTag === "input" || activeTag === "textarea";
const canNavigate = !isTyping;
```

This prevents normal editing from being ruined by keyboard shortcuts.

The `Alt+Arrow` exception lets the user navigate cards even if focused inside an input.

## Exported screen function

```js
export function deckBuilderScreen(app, goTo) {
  render(app, goTo);
}

export default deckBuilderScreen;
```

This is what `main.js` uses to display the Deck Builder screen.

The default export exists because `main.js` imports it like:

```js
import deckBuilderScreen from "./screens/deckBuilder.js";
```

## Main mental model

Think of `deckBuilder.js` as five layers:

```text
1. Draft layer
   loadDraft()
   saveDraft()
   clearDraft()

2. State editing layer
   setDeckField()
   setActiveCardField()
   addCard()
   duplicateActiveCard()
   removeActiveCard()
   goPreviousCard()
   goNextCard()

3. Media layer
   browseAndImportMedia()
   attachImportedMediaPath()
   handleMediaDrop()
   mediaFromPath()

4. Export layer
   builderStateToDeck()
   saveBuilderDeck()

5. UI layer
   renderSidebar()
   renderMetadata()
   renderActiveCardEditor()
   render()
```

## What to be careful with

### 1. Builder state is not `.mflash`

Builder state uses editable text fields like:

```text
tagsText
examplesText
mediaPath
termLang
defLang
```

`.mflash` uses cleaner final fields like:

```text
tags
example_sentences
media
term_language
definition_language
```

The conversion happens in:

```js
builderStateToDeck()
```

If the schema changes, update that function carefully.

### 2. Media drag/drop may not expose real paths

Browser drop events may only provide:

```text
filename.png
```

not:

```text
/home/user/Pictures/filename.png
```

The native picker flow is more reliable:

```text
Browse...
→ pickMediaFile()
→ importMediaFile()
→ copied app-data path
```

### 3. Media must be copied before study mode can reliably load it

A random external path may break later.

The intended durable pipeline is:

```text
user selects media
→ Rust copies file into app data / media
→ builder stores copied path
→ .mflash saves copied path
→ study screen reads copied path
→ media window displays file
```

### 4. Full re-render means event listeners reset

The builder uses:

```js
render(app, goTo);
```

after many actions.

That means any event listener attached directly to a DOM element must be reattached after each render.

This file handles that by attaching listeners inside `render()`.

### 5. Escaping matters

Deck text and card text come from users.

Anything inserted into template HTML should go through:

```js
escapeHtml()
```

Attribute values should also be escaped carefully.

### 6. Drafts can become stale

The localStorage draft format can become incompatible after big builder changes.

If weird old builder behavior appears, clearing localStorage for:

```text
moribundFlash.deckBuilderDraft.v2
```

may fix it.

## Common debugging checklist

If Deck Builder breaks:

```text
[ ] Does `node --check src/screens/deckBuilder.js` pass?
[ ] Does the screen render at all?
[ ] Is there a DevTools console error?
[ ] Does localStorage contain a broken draft?
[ ] Can `activeCard()` return a real card?
[ ] Are input fields using the correct `data-deck-field` or `data-card-field`?
[ ] Is a clicked button using the correct `data-action`?
[ ] Does Save Deck call `builderStateToDeck()`?
[ ] Does the final deck have `schema_version: 1`?
[ ] Does card media become `media: { type, path, alt }`?
[ ] Did the Rust command exist and register in `generate_handler![]`?
```

## Summary

`deckBuilder.js` is the builder controller.

It owns the temporary deck-building state, keeps a local draft, renders the editor, handles card editing, converts builder data into `.mflash`, and sends finished decks to Rust for saving.

Its most important functions are:

```text
loadDraft()
saveDraft()
activeCard()
builderStateToDeck()
saveBuilderDeck()
browseAndImportMedia()
attachImportedMediaPath()
render()
```

Most bugs in this file come from one of four places:

```text
1. builder state and .mflash schema drifting apart
2. localStorage draft data becoming stale
3. media paths not being real/copyable
4. event listeners needing to be reattached after render()
```

Very standard builder goblins. Annoying, but at least they have a map now.

```

Your existing placeholder doc only has the short purpose/goblins section, so this can replace or expand `docs/key-files/02-deck-builder-js.md`. :contentReference[oaicite:1]{index=1}
```
