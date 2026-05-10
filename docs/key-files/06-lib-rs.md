# `src-tauri/src/lib.rs`

Purpose:
- Rust backend command handlers.
- Saves, lists, and loads decks.
- Picks/imports media files.
- Copies media into the app data directory.

Known goblins:
- Commands must be registered in `tauri::generate_handler!`.
- App-data paths and asset protocol scope must agree.
