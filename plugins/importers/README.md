# Importer Plugins

Importer plugins convert outside formats into Moribund Flash data.

## Possible plugin ideas

- CSV importer
- TSV importer
- Markdown vocabulary importer
- Anki-style card importer
- Quizlet-style plain text importer
- Duolingo-style sentence importer

## Proposed pipeline

```text
external file/text
→ importer plugin
→ ImportDeckDraft
→ warnings
→ builder state
→ user reviews
→ save .mflash
```

Importer plugins should not save decks directly. They should return import data and warnings.
