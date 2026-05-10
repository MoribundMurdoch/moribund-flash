# Moribund Flash Plugins

This folder is reserved for Moribund Flash plugin experiments.

Plugins should eventually be grouped by target:

- `deck-builder/` — tools that help create, clean, edit, or transform cards.
- `study-screen/` — tools that change or extend study behavior.
- `importers/` — tools that convert outside formats into Moribund Flash decks.
- `exporters/` — tools that export `.mflash` decks into other formats.
- `themes/` — visual/style packs.

## Current status

Plugin loading is not wired yet.

For now, this folder is a planning scaffold. Do not put arbitrary executable plugins here and expect the app to load them.

## Design rule

Plugins should return structured data or patches.

Good:

```js
return {
  cardPatch: {
    tagsText: "grammar, chapter-1"
  }
};
```

Danger goblin:

```js
document.body.innerHTML = "lol";
```

The app should stay in control.
