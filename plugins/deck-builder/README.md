# Deck Builder Plugins

Deck Builder plugins are for tools that help create, edit, clean, or transform cards while using the Deck Builder.

## Possible plugin ideas

- Clean tags
- Bulk edit cards
- Normalize language fields
- Generate reverse cards
- Split example sentences into separate cards
- Validate missing terms/definitions
- Add card templates

## Proposed hook types

- `deckActions`
- `cardActions`
- `onCardCreated`
- `onBeforeSaveDeck`
- `onAfterSaveDeck`

## Proposed plugin output

Deck Builder plugins should return patches, not mutate app state directly.

```js
return {
  activeCardPatch: {
    tagsText: "vocabulary, chapter-1"
  }
};
```
