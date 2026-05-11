use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::io::Read;
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

#[derive(Serialize)]
struct MediaImportResult {
    original_path: String,
    stored_path: String,
    file_name: String,
    media_type: String,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {name}! You've been greeted from Rust!")
}

#[tauri::command]
fn pick_media_file() -> Result<Option<String>, String> {
    let file = rfd::FileDialog::new()
        .add_filter(
            "Media",
            &[
                "png", "jpg", "jpeg", "gif", "webp", "svg", "mp4", "webm", "mov", "m4v", "ogg",
                "mp3", "wav",
            ],
        )
        .pick_file();

    Ok(file.map(|path| path.to_string_lossy().to_string()))
}

#[tauri::command]
fn import_media_file(
    app: tauri::AppHandle,
    source_path: String,
) -> Result<MediaImportResult, String> {
    let source_path = normalize_source_path(&source_path);
    let source = PathBuf::from(&source_path);

    if !source.exists() {
        return Err(format!("Media file does not exist: {}", source.display()));
    }

    if !source.is_file() {
        return Err(format!("Media path is not a file: {}", source.display()));
    }

    if !is_supported_media_file(&source) {
        return Err(format!("Unsupported media file type: {}", source.display()));
    }

    let media_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("media");

    fs::create_dir_all(&media_dir).map_err(|error| error.to_string())?;

    let file_stem = source
        .file_stem()
        .and_then(|value| value.to_str())
        .map(sanitize_file_stem)
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "media".to_string());

    let extension = source
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_lowercase())
        .unwrap_or_else(|| "bin".to_string());

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_millis();

    let file_name = format!("{file_stem}-{timestamp}.{extension}");
    let destination = media_dir.join(&file_name);

    fs::copy(&source, &destination).map_err(|error| {
        format!(
            "Failed to copy {} to {}: {error}",
            source.display(),
            destination.display()
        )
    })?;

    Ok(MediaImportResult {
        original_path: source.to_string_lossy().to_string(),
        stored_path: destination.to_string_lossy().to_string(),
        file_name,
        media_type: media_type_from_extension(&extension).to_string(),
    })
}

#[tauri::command]
fn save_deck(app: tauri::AppHandle, deck: Value) -> Result<Value, String> {
    let decks_dir = decks_dir(&app)?;
    fs::create_dir_all(&decks_dir).map_err(|error| error.to_string())?;

    let file_stem = deck_file_stem(&deck);
    let path = decks_dir.join(format!("{file_stem}.mflash.json"));

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
fn load_deck(
    app: tauri::AppHandle,
    id: Option<String>,
    path: Option<String>,
) -> Result<Value, String> {
    let deck_path = match path {
        Some(path) if !path.trim().is_empty() => PathBuf::from(path),
        _ => {
            let id = id
                .filter(|value| !value.trim().is_empty())
                .ok_or_else(|| "Expected either id or path.".to_string())?;

            let base_stem = sanitize_file_stem(&id);
            let dir = decks_dir(&app)?;

            let primary_path = dir.join(format!("{}.mflash.json", base_stem));
            if primary_path.exists() {
                primary_path
            } else {
                dir.join(format!("{}.mflash", base_stem))
            }
        }
    };

    let raw = fs::read_to_string(&deck_path)
        .map_err(|error| format!("Failed to read {}: {error}", deck_path.to_string_lossy()))?;

    let mut deck: Value = serde_json::from_str(&raw)
        .map_err(|error| format!("Failed to parse {}: {error}", deck_path.to_string_lossy()))?;

    if let Some(object) = deck.as_object_mut() {
        object.insert(
            "path".to_string(),
            Value::String(deck_path.to_string_lossy().to_string()),
        );
    }

    Ok(deck)
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

        if !path.is_file() {
            continue;
        }

        let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");

        if !file_name.ends_with(".mflash.json") && !file_name.ends_with(".mflash") {
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

#[tauri::command]
fn import_packaged_deck(app: tauri::AppHandle, archive_path: String) -> Result<Value, String> {
    let archive_path = normalize_source_path(&archive_path);
    let archive_file = fs::File::open(&archive_path)
        .map_err(|error| format!("Failed to open archive: {error}"))?;

    let mut archive = zip::ZipArchive::new(archive_file)
        .map_err(|error| format!("Failed to read ZIP format: {error}"))?;

    // 1. Verify and extract the raw JSON first. Do not write to disk yet.
    let mut deck_json_string = String::new();
    {
        let mut deck_file = archive
            .by_name("deck.json")
            .map_err(|_| "Invalid archive: missing deck.json at root".to_string())?;
        deck_file
            .read_to_string(&mut deck_json_string)
            .map_err(|error| format!("Failed to read deck.json: {error}"))?;
    }

    // 2. Parse to ensure it is valid JSON before we extract media
    let mut deck: Value = serde_json::from_str(&deck_json_string)
        .map_err(|error| format!("Invalid deck.json format: {error}"))?;

    // 3. Prepare destination directory for media
    let media_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("media");
    fs::create_dir_all(&media_dir).map_err(|error| error.to_string())?;

    // 4. Safely extract media files
    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|error| error.to_string())?;

        // enclosed_name() prevents Zip Slip (directory traversal attacks)
        let outpath = match file.enclosed_name() {
            Some(path) => path,
            None => continue,
        };

        // Only care about files explicitly inside the media/ folder
        if outpath.starts_with("media/") && file.is_file() {
            if let Some(file_name) = outpath.file_name() {
                let dest_path = media_dir.join(file_name);
                let mut outfile = fs::File::create(&dest_path)
                    .map_err(|error| format!("Failed to create media file: {error}"))?;
                std::io::copy(&mut file, &mut outfile)
                    .map_err(|error| format!("Failed to write media file: {error}"))?;
            }
        }
    }

    // 5. Save the deck using the new raw JSON format
    let decks_dir = decks_dir(&app)?;
    fs::create_dir_all(&decks_dir).map_err(|error| error.to_string())?;

    let file_stem = deck_file_stem(&deck);
    let dest_path = decks_dir.join(format!("{file_stem}.mflash.json"));

    fs::write(&dest_path, &deck_json_string)
        .map_err(|error| format!("Failed to save extracted deck: {error}"))?;

    if let Some(object) = deck.as_object_mut() {
        object.insert(
            "path".to_string(),
            Value::String(dest_path.to_string_lossy().to_string()),
        );
    }

    Ok(deck)
}

fn normalize_source_path(path: &str) -> String {
    let trimmed = path.trim();

    if let Some(stripped) = trimmed.strip_prefix("file://") {
        stripped.replace("%20", " ")
    } else {
        trimmed.to_string()
    }
}

fn is_supported_media_file(path: &Path) -> bool {
    path.extension()
        .and_then(|value| value.to_str())
        .map(|extension| {
            matches!(
                extension.to_lowercase().as_str(),
                "png"
                    | "jpg"
                    | "jpeg"
                    | "gif"
                    | "webp"
                    | "svg"
                    | "mp4"
                    | "webm"
                    | "mov"
                    | "m4v"
                    | "ogg"
                    | "mp3"
                    | "wav"
            )
        })
        .unwrap_or(false)
}

fn media_type_from_extension(extension: &str) -> &'static str {
    match extension.to_lowercase().as_str() {
        "png" | "jpg" | "jpeg" | "gif" | "webp" | "svg" => "image",
        "mp4" | "webm" | "mov" | "m4v" => "video",
        "ogg" | "mp3" | "wav" => "audio",
        _ => "file",
    }
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
        .invoke_handler(tauri::generate_handler![
            greet,
            save_deck,
            list_decks,
            load_deck,
            pick_media_file,
            import_media_file,
            import_packaged_deck
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
