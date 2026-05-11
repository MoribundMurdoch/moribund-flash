# Moribund Flash 🎴
### The Spaced-Repetition Powerhouse for the `.mflash` Ecosystem

**Moribund Flash** is a high-performance desktop application built for **Feynman-esque learners**. By combining the efficiency of **Rust** and **Tauri** with a focus on modularity and "physical" interactivity, it offers a free, subscription-less alternative to bloated flashcard software.

---

## 🏗️ The Ecosystem

This application serves as the primary engine for a modular platform designed for longevity and portability:

* **[mflash-spec](https://github.com/MoribundMurdoch/mflash-os-integrations/blob/main/SPEC.md)**: The open technical standard for `.mflash` deck archives.
* **[mflash-os-integrations](https://github.com/MoribundMurdoch/mflash-os-integrations)**: Native Linux hooks providing system-wide MIME recognition and cover art thumbnails.

---

## ✨ Key Features

### 🌍 Language Learning Powerhouse (Polyglot Friendly)
Break the "One Deck, One Language" barrier.
* **Granular Control**: Set a global language for the deck or override it for individual terms and definitions.
* **Mixed-Media Mastery**: Support for images and video to provide the context necessary for true fluency.

### ⚡ Near-Zero Overhead
Built for speed.
* **Tauri + Rust**: Minimal RAM footprint and instant startup times—no more waiting for Electron to wake up.
* **Native Integration**: Open `.mflash` files directly from your file manager like any other document.

### 🎮 Tactile Learning
Flashcards shouldn't feel like a spreadsheet.
* **Interactive UI**: Featuring draggable cards and fluid animations to make review sessions engaging rather than a chore.
* **SRS Intelligence**: Optimized algorithms designed to maximize retention while minimizing total study time.

---

## 🛠️ Developer Setup

### Prerequisites
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Node.js](https://nodejs.org/) (LTS)
- **Recommended IDE**: [VS Code](https://code.visualstudio.com/) + [Tauri Plugin](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

### Running Locally
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install

```

3. Launch development mode:
```bash
npm run tauri dev

```



### Building for Production

To generate a production-ready installer for your OS:

```bash
npm run tauri build
