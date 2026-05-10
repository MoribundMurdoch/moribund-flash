# `src/api.js`

Purpose:
- Frontend API firewall.
- Wraps Tauri command calls.
- Normalizes decks and cards.
- Preserves `.mflash` data for frontend screens.

Known goblins:
- If a Rust command is not registered, calls fail with "Command not found."
- Normalization can accidentally drop fields like media.
