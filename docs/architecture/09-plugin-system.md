# Plugin System

Moribund Flash may eventually support plugins.

The planned plugin categories are:

```text
plugins/
  deck-builder/
  study-screen/
  importers/
  exporters/
  themes/
```

## Current status

Plugin loading is not implemented yet.

This is currently a folder and architecture scaffold.

## Design goals

- Keep plugins screen-specific.
- Prefer data-in/data-out plugins.
- Avoid arbitrary access to the whole app.
- Start with built-in/internal plugins before external plugin loading.
- Add permissions before loading third-party/local plugin code.

## Plugin categories

### Deck Builder plugins

Tools that help create, edit, clean, or transform cards.

Examples:

- Clean tags
- Bulk edit cards
- Normalize language fields
- Generate reverse cards
- Split example sentences

### Study Screen plugins

Tools that change study behavior.

Examples:

- Typing answer mode
- Reverse card mode
- Image prompt mode
- Audio-only mode
- Timer mode

### Importer plugins

Tools that convert outside formats into Moribund Flash import drafts.

Examples:

- CSV importer
- TSV importer
- Markdown vocabulary importer
- Anki-style importer

### Exporter plugins

Tools that convert `.mflash` into other formats.

Examples:

- CSV exporter
- Markdown exporter
- Printable HTML exporter

### Theme plugins

Visual packs and style extensions.

Examples:

- PC-98 theme
- Paper flashcard theme
- High contrast theme

## Core rule

Plugins should return structured data or patches.

Good:

```js
return {
  activeCardPatch: {
    tagsText: "grammar, chapter-1"
  }
};
```

Bad:

```js
document.querySelector("#app").innerHTML = "oops";
```

The app should apply plugin results after validation.

## Proposed future phases

```text
Phase P1: Folder structure and docs.
Phase P2: Built-in plugin registry.
Phase P3: Deck Builder action plugins.
Phase P4: Importer/exporter plugins.
Phase P5: Study mode plugins.
Phase P6: External plugin loading with permissions.
```
