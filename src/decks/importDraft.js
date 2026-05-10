// src/decks/importDraft.js

/**
 * ImportDeckDraft and ImportCardDraft are intentionally loose.
 *
 * They are the quarantine zone between:
 *   - weird imported data
 *   - clean .mflash v1 decks
 *   - Deck Builder state
 *
 * Do not make raw importers write straight to MflashDeck.
 * That way lies raccoon architecture.
 */

export function createImportDeckDraft(raw = {}) {
  const warnings = [];

  const rawDeck = isPlainObject(raw.deck) ? raw.deck : raw;

  const title = firstString(
    rawDeck.title,
    rawDeck.name,
    rawDeck.deckName,
    raw.name,
    "Untitled Imported Deck"
  );

  const tags = stringArrayOrSplit(rawDeck.tags ?? rawDeck.deckTags ?? raw.tags);
  const cardsRaw = Array.isArray(raw.cards) ? raw.cards : [];

  if (!Array.isArray(raw.cards)) {
    warnings.push(warning(
      "missing_cards",
      "Import did not contain a cards array. Created an empty draft.",
      "cards"
    ));
  }

  const cards = cardsRaw.map((card, index) =>
    createImportCardDraft(card, index)
  );

  const cardWarnings = cards.flatMap((card) => card.warnings);

  if (cards.length === 0) {
    warnings.push(warning(
      "empty_deck",
      "Imported deck has no cards.",
      "cards"
    ));
  }

  return {
    kind: "ImportDeckDraft",
    title,
    description: firstString(rawDeck.description, raw.description, ""),
    tags,
    media: normalizeMedia(rawDeck.media ?? rawDeck.coverMedia ?? rawDeck.mediaPath),
    notes: firstString(rawDeck.notes, ""),
    source_id: stringOrNull(rawDeck.source_id ?? rawDeck.sourceId ?? raw.source_id),
    extra_fields: isPlainObject(rawDeck.extra_fields)
      ? rawDeck.extra_fields
      : {},
    cards,
    warnings: [...warnings, ...cardWarnings],
  };
}

export function createImportCardDraft(raw = {}, index = 0) {
  const warnings = [];
  const cardNumber = index + 1;

  if (!isPlainObject(raw)) {
    warnings.push(warning(
      "invalid_card",
      `Card ${cardNumber} was not an object. Created an empty card draft.`,
      `cards.${index}`
    ));

    raw = {};
  }

  const term = firstString(
    raw.term,
    raw.front,
    raw.prompt,
    raw.question,
    ""
  );

  const definition = firstString(
    raw.definition,
    raw.back,
    raw.answer,
    raw.translation,
    ""
  );

  if (!term) {
    warnings.push(warning(
      "missing_term",
      `Card ${cardNumber} has no term/front text.`,
      `cards.${index}.term`
    ));
  }

  if (!definition) {
    warnings.push(warning(
      "missing_definition",
      `Card ${cardNumber} has no definition/back text.`,
      `cards.${index}.definition`
    ));
  }

  const exampleSentences = stringArrayOrLines(
    raw.example_sentences ??
    raw.examples ??
    raw.exampleSentences ??
    raw.metadata?.examples
  );

  return {
    kind: "ImportCardDraft",
    id: firstString(raw.id, `card-${cardNumber}`),
    term,
    definition,
    term_language: firstString(
      raw.term_language,
      raw.termLanguage,
      raw.termLang,
      raw.metadata?.termLang,
      ""
    ),
    definition_language: firstString(
      raw.definition_language,
      raw.definitionLanguage,
      raw.defLang,
      raw.metadata?.defLang,
      ""
    ),
    example_sentences: exampleSentences,
    tags: stringArrayOrSplit(raw.tags),
    media: normalizeMedia(raw.media ?? raw.mediaPath ?? raw.metadata?.mediaPath),
    hyperlink: stringOrNull(raw.hyperlink ?? raw.url ?? raw.metadata?.hyperlink),
    notes: firstString(raw.notes, ""),
    source_id: stringOrNull(raw.source_id ?? raw.sourceId),
    extra_fields: isPlainObject(raw.extra_fields)
      ? raw.extra_fields
      : {},
    warnings,
  };
}

export function importDraftToMflashDeck(draft) {
  const safeDraft = draft?.kind === "ImportDeckDraft"
    ? draft
    : createImportDeckDraft(draft);

  const deckId = slugify(safeDraft.title) || "imported_deck";

  return {
    schema_version: 1,
    deck: {
      id: deckId,
      title: safeDraft.title || "Untitled Imported Deck",
      description: safeDraft.description || "",
      tags: safeDraft.tags,
      media: safeDraft.media,
      notes: safeDraft.notes || "",
      source_id: safeDraft.source_id,
      extra_fields: safeDraft.extra_fields,
    },
    cards: safeDraft.cards.map((card, index) => ({
      id: card.id || `card-${index + 1}`,
      term: card.term || "",
      definition: card.definition || "",
      term_language: card.term_language || "",
      definition_language: card.definition_language || "",
      example_sentences: Array.isArray(card.example_sentences)
        ? card.example_sentences
        : [],
      tags: Array.isArray(card.tags) ? card.tags : [],
      media: card.media,
      hyperlink: card.hyperlink,
      notes: card.notes || "",
      source_id: card.source_id,
      extra_fields: isPlainObject(card.extra_fields) ? card.extra_fields : {},
    })),
  };
}

export function importDraftToBuilderState(draft) {
  const safeDraft = draft?.kind === "ImportDeckDraft"
    ? draft
    : createImportDeckDraft(draft);

  return {
    fileName: safeDraft.title || "imported_deck",
    tagsText: safeDraft.tags.join(", "),
    mediaPath: mediaToPath(safeDraft.media),
    cards: safeDraft.cards.length
      ? safeDraft.cards.map((card, index) => ({
          id: card.id || `card-${index + 1}`,
          term: card.term || "",
          definition: card.definition || "",
          termLang: card.term_language || "",
          defLang: card.definition_language || "",
          hyperlink: card.hyperlink || "",
          mediaPath: mediaToPath(card.media),
          tagsText: Array.isArray(card.tags) ? card.tags.join(", ") : "",
          examplesText: Array.isArray(card.example_sentences)
            ? card.example_sentences.join("\\n")
            : "",
        }))
      : [
          {
            id: "card-1",
            term: "",
            definition: "",
            termLang: "",
            defLang: "",
            hyperlink: "",
            mediaPath: "",
            tagsText: "",
            examplesText: "",
          },
        ],
    activeIndex: 0,
    searchText: "",
    status: safeDraft.warnings.length
      ? `Imported with ${safeDraft.warnings.length} warning(s).`
      : "Imported deck draft.",
    error: "",
  };
}

export function getImportWarnings(draft) {
  return Array.isArray(draft?.warnings) ? draft.warnings : [];
}

function warning(code, message, path) {
  return {
    level: "warning",
    code,
    message,
    path,
  };
}

function normalizeMedia(value) {
  if (!value) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    return {
      type: "file",
      path: trimmed,
      alt: "",
    };
  }

  if (isPlainObject(value)) {
    const path = firstString(value.path, value.src, value.url, "");

    if (!path) return null;

    return {
      type: firstString(value.type, "file"),
      path,
      alt: firstString(value.alt, ""),
    };
  }

  return null;
}

function mediaToPath(media) {
  return isPlainObject(media) && typeof media.path === "string"
    ? media.path
    : "";
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }

  const fallback = values.at(-1);
  return typeof fallback === "string" ? fallback : "";
}

function stringOrNull(value) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function stringArrayOrSplit(value) {
  if (Array.isArray(value)) {
    return value
      .filter((item) => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function stringArrayOrLines(value) {
  if (Array.isArray(value)) {
    return value
      .filter((item) => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split("\\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "_")
    .replaceAll(/^_+|_+$/g, "");
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}
