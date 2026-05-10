# Tauri Zero to Hero

Tauri is the bridge between the frontend and the Rust backend.

Moribund Flash uses Tauri because it lets us build a desktop app with:

- HTML
- CSS
- vanilla JavaScript
- Rust
- local filesystem access
- no giant browser-bundler circus

The frontend is the face.

Rust is the muscle.

Tauri is the little elevator between them.

## What Tauri does in Moribund Flash

Moribund Flash is not a website.

It is a desktop app whose interface is built with web technologies.

A Tauri app uses a native desktop shell that displays local HTML, CSS, and JavaScript inside a webview.

That means:

```text
Frontend:
  HTML, CSS, JavaScript

Backend:
  Rust

Bridge:
  Tauri

The frontend renders screens.

Rust reads decks, saves decks, parses .mflash files, and handles local file logic.

Tauri lets JavaScript ask Rust to do those things.

The mental model

JavaScript says:

Hey Rust, list my decks.

Tauri carries the message.

Rust says:

Fine. I can touch the filesystem. You cannot. Here is the list.

Tauri carries the result back.

JavaScript renders it.

That is the whole trick.

Frontend side

In Moribund Flash, the frontend uses:

window.__TAURI__.core.invoke

Example:

const decks = await window.__TAURI__.core.invoke("list_decks");

That calls a Rust command named:

list_decks

But screen files should not call Tauri directly.

Bad:

const decks = await window.__TAURI__.core.invoke("list_decks");

Good:

import { listDecks } from "../api.js";

const decks = await listDecks();

The api.js file is the firewall.

It keeps the rest of the frontend from becoming a bucket of random Tauri calls.

Rust side

A Rust function becomes callable from JavaScript when it is marked with:

#[tauri::command]

Example:

#[tauri::command]
fn list_decks() -> Result<Vec<DeckSummary>, String> {
    todo!()
}

This is called a command handler.

It handles a command from JavaScript.

Registering commands

Defining a command is not enough.

Tauri also needs to know the command exists.

That happens in the Tauri builder:

tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        list_decks,
        load_deck
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");

If JavaScript calls "list_decks" but Rust did not register list_decks, the app will complain.

Not because it hates you personally.

Probably.

Current Moribund Flash command plan

The app will likely need these commands:

list_decks
  Find available deck files.

load_deck
  Load one deck and return cards.

save_deck
  Save a deck or study progress.

import_deck
  Import a deck from somewhere else.

export_deck
  Export a deck to a chosen location.

delete_deck
  Delete or remove a deck.

These commands are called from src/api.js.

Why JavaScript does not do everything

JavaScript in the frontend is good at:

rendering screens
handling buttons
handling keyboard focus
playing sounds
storing simple options in localStorage
showing study cards

Rust is better for:

filesystem access
parsing deck files
saving deck files
converting legacy formats
heavier data logic

So the split is:

JavaScript owns the interface.

Rust owns the filesystem.

Tauri lets them talk.
The src-tauri/ folder

The Rust backend lives in:

src-tauri/

Important files:

src-tauri/src/lib.rs
  Main Rust app logic and command handlers.

src-tauri/src/main.rs
  Starts the Tauri app.

src-tauri/tauri.conf.json
  Tauri configuration.

src-tauri/Cargo.toml
  Rust dependencies and package settings.
The tauri.conf.json file

This project uses the global Tauri object:

window.__TAURI__

For that to work, the Tauri config needs global Tauri enabled.

The important idea is:

{
  "app": {
    "withGlobalTauri": true
  }
}

Without that, window.__TAURI__ may not exist in the frontend.

Then api.js will yell, and honestly, fair.

Native ES modules and Tauri

Moribund Flash uses browser-native JavaScript modules.

That means imports need explicit .js endings.

Good:

import { listDecks } from "./api.js";

Bad:

import { listDecks } from "./api";

There is no bundler here to guess the file extension.

No Vite.

No Webpack.

No magical front-end soup ladle.

CSS and Tauri

CSS should be loaded from HTML:

<link rel="stylesheet" href="./styles.css">

Do not import CSS from JavaScript:

import "./styles.css";

That is bundler behavior.

This project does not use a bundler, so the browser may throw a MIME type error.

The browser sees CSS being imported as JavaScript and says:

No.

And for once, the browser is correct.

Development flow

Typical development command:

npm run tauri dev

That starts the Tauri development environment.

The frontend files come from:

src/

The Rust backend comes from:

src-tauri/

When frontend files change, the app usually reloads quickly.

When Rust files change, the Rust side has to rebuild.

Data flow example: deck list

The deck list screen needs available decks.

The flow should look like this:

screens/deckList.js
  calls listDecks()

api.js
  calls invoke("list_decks")

Rust command handler
  scans the decks folder

Rust returns deck summaries

api.js
  normalizes snake_case to camelCase

deckList.js
  renders the deck buttons

The screen should not care how Rust found the decks.

The screen should only care that it received usable data.

Data flow example: loading a deck

The study screen needs cards.

study.js
  asks api.js to load a deck

api.js
  invokes "load_deck"

Rust
  opens the deck file
  parses .json or .mflash
  returns a deck object

api.js
  normalizes cards

study.js
  displays the cards

The study screen should not parse old deck formats.

That is Rust's job.

Otherwise study.js becomes a junk drawer with a flip-card animation stapled to it.

Common Tauri errors
window.__TAURI__ is undefined

Possible causes:

The app is running in a normal browser instead of Tauri.
withGlobalTauri is not enabled.
The frontend loaded before Tauri was available.
The config is wrong.
command not found

Possible causes:

The Rust function does not exist.
The Rust function is not marked with #[tauri::command].
The command was not registered in generate_handler!.
JavaScript used the wrong command name.
MIME type error

Possible cause:

CSS was imported from JavaScript.

Fix:

<link rel="stylesheet" href="./styles.css">
Import path error

Possible cause:

import { something } from "./file";

Fix:

import { something } from "./file.js";
Moribund Flash Tauri philosophy

Use Tauri as a bridge, not as a dumping ground.

Good:

api.js calls Rust commands.
Rust returns plain data.
Screens render that data.

Bad:

Every screen randomly invokes Rust commands directly.
Rust returns weird shapes.
JavaScript guesses what the backend meant.
Everyone suffers.

A good Tauri app has boring boundaries.

Boring boundaries are good.

Exciting boundaries are how you get haunted software.

Things to learn next
How api.js wraps Tauri commands
How #[tauri::command] works in Rust
How list_decks should scan the decks folder
How load_deck should parse .json and .mflash
How frontend screen modules stay separate from backend logic
