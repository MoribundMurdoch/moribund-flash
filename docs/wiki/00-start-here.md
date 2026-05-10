# Start Here

Moribund Flash is an offline flashcard app.

It is built with:

- HTML for structure
- CSS for appearance
- JavaScript for interface behavior
- Rust for filesystem and backend logic
- Tauri for connecting the frontend and backend

The frontend is deliberately simple. There is no Vite, no Webpack, and no React.

The backend is Rust. JavaScript asks Rust to do backend work through Tauri commands.

## Core idea

JavaScript owns the user interface.

Rust owns the filesystem.

Tauri lets them talk.
