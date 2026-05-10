use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

#[derive(Serialize)]
struct DeckSummary {
    id: Option<String>,
    name: String,
    path: String,
    format: String,
    card_count: usize,
    modified_at: Option<String>,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {name}! You've been greeted from Rust!")
}

#[tauri::command]
fn save_deck(app: tauri::AppHandle, deck: Value) -> Result<Value, String> {
    let decks_dir = decks_dir(&app)?;
    fs::create_dir_all(&decks_dir).map_err(|error| error.to_string())?;

    let file_stem = deck_file_stem(&deck);
    let path = decks_dir.join(format!("{file_stem}.mflash"));

    let json = serde_json::to_string_pretty(&deck).map_err(|error| error.to_string())?;
    fs::write(&path, json).map_err(|error| error.to_string())?;

    let mut saved_deck = deck;

    if let Some(object) = saved_deck.as_object_mut() {
        object.insert(
            "path".to_string(),
            Value::String(path.to_string_lossy().to_string()),
        );
    }

    Ok(saved_deck)
}

#[tauri::command]
fn list_decks(app: tauri::AppHandle) -> Result<Vec<DeckSummary>, String> {
    let decks_dir = decks_dir(&app)?;

    if !decks_dir.exists() {
        return Ok(Vec::new());
    }

    let entries = fs::read_dir(&decks_dir).map_err(|error| error.to_string())?;
    let mut decks = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();

        if path.extension().and_then(|ext| ext.to_str()) != Some("mflash") {
            continue;
        }

        let raw = fs::read_to_string(&path).map_err(|error| error.to_string())?;
        let parsed: Value = serde_json::from_str(&raw)
            .map_err(|error| format!("Failed to parse {}: {error}", path.to_string_lossy()))?;

        decks.push(deck_summary_from_value(&parsed, &path)?);
    }

    decks.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    Ok(decks)
}

fn decks_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    Ok(app_data_dir.join("decks"))
}

fn deck_file_stem(deck: &Value) -> String {
    let candidate = deck
        .pointer("/deck/id")
        .and_then(Value::as_str)
        .or_else(|| deck.pointer("/deck/title").and_then(Value::as_str))
        .or_else(|| deck.get("id").and_then(Value::as_str))
        .or_else(|| deck.get("name").and_then(Value::as_str))
        .unwrap_or("new_deck");

    sanitize_file_stem(candidate)
}

fn sanitize_file_stem(value: &str) -> String {
    let mut output = String::new();

    for character in value.trim().to_lowercase().chars() {
        if character.is_ascii_alphanumeric() {
            output.push(character);
        } else if character == '-' || character == '_' || character.is_whitespace() {
            output.push('_');
        }
    }

    let collapsed = output
        .split('_')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("_");

    if collapsed.is_empty() {
        "new_deck".to_string()
    } else {
        collapsed
    }
}

fn deck_summary_from_value(deck: &Value, path: &Path) -> Result<DeckSummary, String> {
    let is_v1 = deck.get("schema_version").and_then(Value::as_i64) == Some(1)
        && deck.get("deck").and_then(Value::as_object).is_some();

    let id = if is_v1 {
        deck.pointer("/deck/id")
            .and_then(Value::as_str)
            .map(ToString::to_string)
    } else {
        deck.get("id")
            .and_then(Value::as_str)
            .map(ToString::to_string)
    };

    let name = if is_v1 {
        deck.pointer("/deck/title")
            .and_then(Value::as_str)
            .unwrap_or("Untitled Deck")
            .to_string()
    } else {
        deck.get("name")
            .and_then(Value::as_str)
            .unwrap_or("Untitled Deck")
            .to_string()
    };

    let card_count = deck
        .get("cards")
        .and_then(Value::as_array)
        .map(|cards| cards.len())
        .unwrap_or(0);

    let modified_at = fs::metadata(path)
        .ok()
        .and_then(|metadata| metadata.modified().ok())
        .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|duration| duration.as_secs().to_string());

    Ok(DeckSummary {
        id,
        name,
        path: path.to_string_lossy().to_string(),
        format: "mflash".to_string(),
        card_count,
        modified_at,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, save_deck, list_decks])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
