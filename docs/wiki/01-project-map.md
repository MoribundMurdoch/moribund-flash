# Project Map

## `src/`

The frontend.

These files are served directly by Tauri. They are plain browser files.

## `src/index.html`

The page shell. It loads CSS normally and loads `main.js` as a module.

## `src/main.js`

The frontend router. It switches between screens.

## `src/api.js`

The firewall between JavaScript and Rust.

Frontend code should call functions from `api.js`, not call Tauri directly.

## `src/screens/`

Each screen gets its own JavaScript module.

## `src-tauri/`

The Rust backend and Tauri configuration.
