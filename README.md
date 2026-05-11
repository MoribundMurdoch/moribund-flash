# Moribund Flash
### The Spaced-Repetition Powerhouse for the `.mflash` Ecosystem

**Moribund Flash** is a high-performance desktop application designed for serious learners. Built with **Tauri** and **Rust**, it offers a native, lightweight alternative to traditional flashcard software, focusing on speed, modularity, and system-level integration.

---

## 🏗️ The Ecosystem

This application is the primary study interface for the modular **.mflash** platform. It works in tandem with:

* **[mflash-spec](https://github.com/MoribundMurdoch/mflash-os-integrations/blob/main/SPEC.md)**: The technical standard defining the open `.mflash` container format.
* **[mflash-os-integrations](https://github.com/MoribundMurdoch/mflash-os-integrations)**: Native Linux hooks that provide system-wide MIME types and cover art thumbnails for your decks.

---

## ✨ Features

* **Rust-Powered Performance**: Near-instant startup times and minimal RAM usage compared to Electron-based alternatives.
* **Native Desktop Experience**: Deep integration with your OS, allowing you to open `.mflash` files directly from your file manager.
* **Format Native**: Fully compliant with the `.mflash` specification for portable, shareable flashcard decks.
* **Spaced Repetition (SRS)**: Optimized learning algorithms designed to maximize retention while minimizing study time.

---

## 🛠️ Developer Setup

### Prerequisites
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Node.js](https://nodejs.org/) (LTS)
- **Recommended IDE**: [VS Code](https://code.visualstudio.com/) + [Tauri Plugin](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

### Running Locally
1. Clone this repository.
2. Install the frontend dependencies:
   ```bash
   npm install

```

3. Launch the application in development mode:
```bash
npm run tauri dev

```



### Building for Production

To generate a production-ready installer for your specific OS:

```bash
npm run tauri build

```

```

---

### Why this works:
* **The Ecosystem Section**: It immediately tells anyone landing on the page that there is a standard (`spec`) and system tools (`integrations`) behind this app, which adds massive "Aura" and credibility to the project.
* **Platform Focus**: Highlighting Rust and Tauri appeals to users who are tired of heavy, slow applications.
* **Clear Call to Action**: The installation and dev instructions are standardized so anyone can start contributing or testing right away.

**Expert Guide Question:**
Now that your repositories are synced and the ecosystem is properly documented, should we dive into the **Study Screen UI** (designing the card flip animations and layout) or the **SRS Brain** (coding the math that decides when a card is "due")?