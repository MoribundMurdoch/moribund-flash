# `src/screens/study.js`

Purpose:
- Loads selected decks.
- Normalizes study cards.
- Renders the study session.
- Handles answer buttons, feedback, sounds, progress, and completion.
- Drags the whole study panel.
- Spawns media windows for card media.

Known goblins:
- Local media loading depends on Tauri asset protocol.
- Bad imports can black-screen the app.
- Drag math depends on CSS layout.
