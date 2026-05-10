# Exporter Plugins

Exporter plugins convert `.mflash` decks into other formats.

## Possible plugin ideas

- CSV exporter
- Markdown exporter
- Printable HTML exporter
- JSON exporter
- Plain text vocabulary list exporter

## Proposed pipeline

```text
.mflash deck
→ exporter plugin
→ exported string/blob
→ app handles saving
```

Exporter plugins should not write directly to disk at first.
