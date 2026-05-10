# Tauri Command Not Found

Checklist:
- Is the Rust function marked `#[tauri::command]`?
- Is the command registered in `tauri::generate_handler![]`?
- Does `src/api.js` use the correct command name?
- Did you fully restart Tauri?
