// src/api.js
//
// Moribund Flash Tauri API boundary.
//
// This file is intentionally boring.
// Frontend screens should import from here instead of touching Tauri directly.
//
// Rules:
// - no bundler assumptions
// - no bare imports like "@tauri-apps/api/core"
// - no CSS imports
// - all Tauri calls go through invokeCommand()
// - all backend errors get normalized into readable Error objects

const COMMANDS = Object.freeze({
  LIST_DECKS: "list_decks",
  LOAD_DECK: "load_deck",
  SAVE_DECK: "save_deck",
  IMPORT_DECK: "import_deck",
  EXPORT_DECK: "export_deck",
  DELETE_DECK: "delete_deck",
  GET_APP_DATA_DIR: "get_app_data_dir",
});

/**
 * Returns the available Tauri invoke function.
 *
 * Tauri v2:
 *   window.__TAURI__.core.invoke
 *
 * Tauri v1 fallback:
 *   window.__TAURI__.tauri.invoke
 */
function getInvoke() {
  const tauri = window.__TAURI__;

  if (tauri?.core?.invoke) {
    return tauri.core.invoke;
  }

  if (tauri?.tauri?.invoke) {
    return tauri.tauri.invoke;
  }

  throw new Error(
    "Tauri invoke API is unavailable. Make sure this is running inside Tauri and app.withGlobalTauri/build.withGlobalTauri is enabled."
  );
}

/**
 * Normalizes Rust/Tauri errors into regular JS Error objects.
 */
function normalizeApiError(error, commandName) {
  if (error instanceof Error) {
    error.message = `[${commandName}] ${error.message}`;
    return error;
  }

  if (typeof error === "string") {
    return new Error(`[${commandName}] ${error}`);
  }

  try {
    return new Error(`[${commandName}] ${JSON.stringify(error)}`);
  } catch {
    return new Error(`[${commandName}] Unknown API error`);
  }
}

/**
 * Low-level command wrapper.
 *
 * Use this only inside api.js unless you are debugging.
 */
export async function invokeCommand(commandName, args = {}) {
  try {
    const invoke = getInvoke();
    return await invoke(commandName, args);
  } catch (error) {
    throw normalizeApiError(error, commandName);
  }
}

/**
 * True when the frontend appears to be running inside Tauri.
 */
export function isTauriRuntime() {
  return Boolean(
    window.__TAURI__?.core?.invoke ||
    window.__TAURI__?.tauri?.invoke
  );
}

/**
 * Lists available decks known to the backend.
 *
 * Expected Rust return shape:
 *
 * [
 *   {
 *     id: "my-deck",
 *     name: "My Deck",
 *     path: "/full/or/app-relative/path/my-deck.mflash",
 *     format: "mflash",
 *     card_count: 42,
 *     modified_at: "2026-05-10T02:13:00Z"
 *   }
 * ]
 */
export async function listDecks() {
  const decks = await invokeCommand(COMMANDS.LIST_DECKS);

  if (!Array.isArray(decks)) {
    throw new Error("[listDecks] Backend returned a non-array value.");
  }

  return decks.map(normalizeDeckSummary);
}

/**
 * Loads a full deck.
 *
 * Pass either:
 *   loadDeck({ id: "deck-id" })
 * or:
 *   loadDeck({ path: "/path/to/deck.mflash" })
 */
export async function loadDeck({ id = null, path = null } = {}) {
  if (!id && !path) {
    throw new Error("[loadDeck] Expected either id or path.");
  }

  const deck = await invokeCommand(COMMANDS.LOAD_DECK, { id, path });
  return normalizeDeck(deck);
}

/**
 * Saves a deck.
 *
 * Expected input:
 *
 * {
 *   id?: string,
 *   name: string,
 *   cards: [...]
 * }
 */
export async function saveDeck(deck) {
  const normalizedDeck = normalizeDeckForSave(deck);

  const savedDeck = await invokeCommand(COMMANDS.SAVE_DECK, {
    deck: normalizedDeck,
  });

  return normalizeDeck(savedDeck);
}

/**
 * Imports a deck from a user-selected path.
 *
 * The actual file picker can be implemented later.
 * For now, this assumes the caller already has a path.
 */
export async function importDeck(path) {
  if (!isNonEmptyString(path)) {
    throw new Error("[importDeck] Expected a non-empty file path.");
  }

  const importedDeck = await invokeCommand(COMMANDS.IMPORT_DECK, { path });
  return normalizeDeck(importedDeck);
}

/**
 * Exports a deck to a target path.
 */
export async function exportDeck(deck, targetPath) {
  if (!isNonEmptyString(targetPath)) {
    throw new Error("[exportDeck] Expected a non-empty target path.");
  }

  const normalizedDeck = normalizeDeckForSave(deck);

  return await invokeCommand(COMMANDS.EXPORT_DECK, {
    deck: normalizedDeck,
    target_path: targetPath,
  });
}

/**
 * Deletes a deck.
 *
 * Prefer id when possible.
 */
export async function deleteDeck({ id = null, path = null } = {}) {
  if (!id && !path) {
    throw new Error("[deleteDeck] Expected either id or path.");
  }

  return await invokeCommand(COMMANDS.DELETE_DECK, { id, path });
}

/**
 * Optional helper for debugging paths.
 */
export async function getAppDataDir() {
  return await invokeCommand(COMMANDS.GET_APP_DATA_DIR);
}

/**
 * Converts backend deck summaries into predictable frontend objects.
 */
function normalizeDeckSummary(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("[normalizeDeckSummary] Invalid deck summary.");
  }

  return {
    id: stringOrNull(raw.id),
    name: stringOrFallback(raw.name, "Untitled Deck"),
    path: stringOrNull(raw.path),
    format: stringOrFallback(raw.format, "unknown"),
    cardCount: numberOrZero(raw.card_count ?? raw.cardCount),
    modifiedAt: stringOrNull(raw.modified_at ?? raw.modifiedAt),
  };
}

/**
 * Converts a full backend deck into a predictable frontend object.
 */
function normalizeDeck(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("[normalizeDeck] Invalid deck.");
  }

  const cards = Array.isArray(raw.cards) ? raw.cards : [];

  return {
    id: stringOrNull(raw.id),
    name: stringOrFallback(raw.name, "Untitled Deck"),
    description: stringOrFallback(raw.description, ""),
    path: stringOrNull(raw.path),
    format: stringOrFallback(raw.format, "mflash"),
    cards: cards.map(normalizeCard),
    createdAt: stringOrNull(raw.created_at ?? raw.createdAt),
    modifiedAt: stringOrNull(raw.modified_at ?? raw.modifiedAt),
    metadata: isPlainObject(raw.metadata) ? raw.metadata : {},
  };
}

/**
 * Converts a card into the frontend's expected card shape.
 *
 * This is deliberately flexible because old MorFlash decks may have
 * slightly different field names.
 */
function normalizeCard(raw, index) {
  if (!raw || typeof raw !== "object") {
    return {
      id: `card-${index}`,
      front: "",
      back: "",
      hint: "",
      tags: [],
      metadata: {},
    };
  }

  return {
    id: stringOrFallback(raw.id, `card-${index}`),

    // Support several likely legacy names.
    front: stringOrFallback(
      raw.front ?? raw.prompt ?? raw.question ?? raw.term,
      ""
    ),

    back: stringOrFallback(
      raw.back ?? raw.answer ?? raw.definition ?? raw.translation,
      ""
    ),

    hint: stringOrFallback(raw.hint, ""),

    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((tag) => typeof tag === "string")
      : [],

    metadata: isPlainObject(raw.metadata) ? raw.metadata : {},
  };
}

/**
 * Sanitizes a deck before sending it to Rust.
 */
function normalizeDeckForSave(deck) {
  const normalized = normalizeDeck(deck);

  return {
    id: normalized.id,
    name: normalized.name,
    description: normalized.description,
    path: normalized.path,
    format: normalized.format,
    cards: normalized.cards.map((card) => ({
      id: card.id,
      front: card.front,
      back: card.back,
      hint: card.hint,
      tags: card.tags,
      metadata: card.metadata,
    })),
    metadata: normalized.metadata,
  };
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function stringOrNull(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function stringOrFallback(value, fallback) {
  return typeof value === "string" ? value : fallback;
}

function numberOrZero(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

export { COMMANDS };