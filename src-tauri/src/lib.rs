use chrono::Utc;
use directories::ProjectDirs;
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::{
    fs::{self, File},
    io::{Read, Write},
    path::{Component, Path, PathBuf},
};
use tauri_plugin_opener::OpenerExt;
use url::Url;
use zip::{write::SimpleFileOptions, ZipArchive, ZipWriter};

#[derive(Debug, Serialize)]
struct CacheResult {
    url: String,
    status: Option<u16>,
    ok: bool,
    cached_at: Option<String>,
    cache_path: Option<String>,
    error: Option<String>,
}

#[derive(Debug, Serialize)]
struct StartupDocument {
    path: Option<String>,
    content: Option<String>,
    view_mode: bool,
    rock_mode: bool,
}

#[tauri::command]
fn startup_document() -> StartupDocument {
    let path = std::env::args()
        .skip(1)
        .map(PathBuf::from)
        .find(|path| {
            path.extension()
                .and_then(|value| value.to_str())
                .map(|ext| ext.eq_ignore_ascii_case("rdot"))
                .unwrap_or(false)
        });

    let Some(path) = path else {
        return StartupDocument {
            path: None,
            content: None,
            view_mode: false,
            rock_mode: false,
        };
    };

    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    let view_mode = file_name.ends_with(".view.rdot") || file_name.ends_with(".rock.rdot");
    let rock_mode = file_name.ends_with(".rock.rdot");
    let content = fs::read_to_string(&path).ok();

    StartupDocument {
        path: Some(path.to_string_lossy().to_string()),
        content,
        view_mode,
        rock_mode,
    }
}


#[tauri::command]
fn open_local_path(app: tauri::AppHandle, target: String, base_dir: Option<String>) -> Result<String, String> {
    let path = resolve_local_target(&target, base_dir.as_deref())?;
    let canonical = path
        .canonicalize()
        .map_err(|err| format!("パスを確認できません: {err}"))?;

    if !canonical.exists() {
        return Err("対象のファイルまたはフォルダが存在しません".to_string());
    }

    app.opener()
        .open_path(canonical.to_string_lossy().to_string(), None::<&str>)
        .map_err(|err| format!("OSで開けませんでした: {err}"))?;

    Ok(canonical.to_string_lossy().to_string())
}

#[tauri::command]
async fn check_and_cache_url(url: String) -> CacheResult {
    let parsed = match Url::parse(&url) {
        Ok(value) if value.scheme() == "http" || value.scheme() == "https" => value,
        Ok(_) | Err(_) => {
            return CacheResult {
                url,
                status: None,
                ok: false,
                cached_at: None,
                cache_path: None,
                error: Some("http(s) URLではありません".to_string()),
            };
        }
    };

    let response = match reqwest::get(parsed.clone()).await {
        Ok(value) => value,
        Err(err) => {
            return CacheResult {
                url,
                status: None,
                ok: false,
                cached_at: None,
                cache_path: None,
                error: Some(err.to_string()),
            };
        }
    };

    let status = response.status();
    if !status.is_success() {
        return CacheResult {
            url,
            status: Some(status.as_u16()),
            ok: false,
            cached_at: None,
            cache_path: None,
            error: Some(format!("HTTP {}", status.as_u16())),
        };
    }

    let body = match response.text().await {
        Ok(value) => value,
        Err(err) => {
            return CacheResult {
                url,
                status: Some(status.as_u16()),
                ok: false,
                cached_at: None,
                cache_path: None,
                error: Some(err.to_string()),
            };
        }
    };

    let cache_dir = match app_cache_dir().map(|dir| dir.join("web")) {
        Ok(value) => value,
        Err(err) => {
            return CacheResult {
                url,
                status: Some(status.as_u16()),
                ok: false,
                cached_at: None,
                cache_path: None,
                error: Some(err),
            };
        }
    };

    if let Err(err) = fs::create_dir_all(&cache_dir) {
        return CacheResult {
            url,
            status: Some(status.as_u16()),
            ok: false,
            cached_at: None,
            cache_path: None,
            error: Some(err.to_string()),
        };
    }

    let digest = hex_digest(&url);
    let cache_path = cache_dir.join(format!("{digest}.html"));
    if let Err(err) = fs::write(&cache_path, body) {
        return CacheResult {
            url,
            status: Some(status.as_u16()),
            ok: false,
            cached_at: None,
            cache_path: None,
            error: Some(err.to_string()),
        };
    }

    CacheResult {
        url,
        status: Some(status.as_u16()),
        ok: true,
        cached_at: Some(Utc::now().format("%Y-%m-%d %H:%M").to_string()),
        cache_path: Some(cache_path.to_string_lossy().to_string()),
        error: None,
    }
}

#[tauri::command]
fn export_cache_zip(destination_file: String) -> Result<String, String> {
    let cache_dir = app_cache_dir()?;
    fs::create_dir_all(&cache_dir).map_err(|err| err.to_string())?;

    let destination = PathBuf::from(destination_file);
    if let Some(parent) = destination.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).map_err(|err| err.to_string())?;
        }
    }

    let zip_file = File::create(&destination).map_err(|err| err.to_string())?;
    let mut zip = ZipWriter::new(zip_file);
    write_dir_to_zip(&mut zip, &cache_dir, &cache_dir)?;
    zip.finish().map_err(|err| err.to_string())?;

    Ok(destination.to_string_lossy().to_string())
}

#[tauri::command]
fn import_cache_zip(source_file: String) -> Result<String, String> {
    let cache_dir = app_cache_dir()?;
    fs::create_dir_all(&cache_dir).map_err(|err| err.to_string())?;

    let zip_file = File::open(&source_file).map_err(|err| err.to_string())?;
    let mut archive = ZipArchive::new(zip_file).map_err(|err| err.to_string())?;

    for index in 0..archive.len() {
        let mut entry = archive.by_index(index).map_err(|err| err.to_string())?;
        let enclosed = entry
            .enclosed_name()
            .ok_or_else(|| "ZIP内に危険なパスが含まれています".to_string())?
            .to_path_buf();
        let out_path = cache_dir.join(enclosed);

        if entry.is_dir() {
            fs::create_dir_all(&out_path).map_err(|err| err.to_string())?;
        } else {
            if let Some(parent) = out_path.parent() {
                fs::create_dir_all(parent).map_err(|err| err.to_string())?;
            }
            let mut out_file = File::create(&out_path).map_err(|err| err.to_string())?;
            std::io::copy(&mut entry, &mut out_file).map_err(|err| err.to_string())?;
        }
    }

    Ok(cache_dir.to_string_lossy().to_string())
}

#[tauri::command]
fn save_with_template(current_file: Option<String>, content: String, file_name: String) -> Result<String, String> {
    let sanitized = sanitize_file_name(&file_name)?;
    let target_dir = match current_file.as_deref().filter(|value| !value.trim().is_empty()) {
        Some(path) => {
            let current = PathBuf::from(path);
            if current.is_dir() {
                current
            } else {
                current
                    .parent()
                    .map(Path::to_path_buf)
                    .ok_or_else(|| "保存先ディレクトリを解決できません".to_string())?
            }
        }
        None => std::env::current_dir().map_err(|err| err.to_string())?,
    };

    fs::create_dir_all(&target_dir).map_err(|err| err.to_string())?;
    let target = target_dir.join(sanitized);
    fs::write(&target, content).map_err(|err| err.to_string())?;
    Ok(target.to_string_lossy().to_string())
}

fn resolve_local_target(target: &str, base_dir: Option<&str>) -> Result<PathBuf, String> {
    let raw_path = if let Some(rest) = target.strip_prefix("file://") {
        Url::parse(target)
            .ok()
            .and_then(|url| url.to_file_path().ok())
            .unwrap_or_else(|| PathBuf::from(rest))
    } else if let Some(rest) = target.strip_prefix("file:") {
        PathBuf::from(rest)
    } else {
        PathBuf::from(target)
    };

    let path = if raw_path.is_absolute() {
        raw_path
    } else {
        let base = match base_dir {
            Some(value) => PathBuf::from(value),
            None => std::env::current_dir().map_err(|err| err.to_string())?,
        };
        base.join(raw_path)
    };

    normalize_path(&path)
}

fn normalize_path(path: &Path) -> Result<PathBuf, String> {
    let mut normalized = PathBuf::new();
    for component in path.components() {
        match component {
            Component::CurDir => {}
            Component::ParentDir => {
                normalized.pop();
            }
            _ => normalized.push(component.as_os_str()),
        }
    }
    Ok(normalized)
}

fn app_cache_dir() -> Result<PathBuf, String> {
    ProjectDirs::from("app", "RoDots", "RoDots")
        .map(|dirs| dirs.cache_dir().join("caches"))
        .ok_or_else(|| "アプリ用キャッシュディレクトリを解決できません".to_string())
}

fn hex_digest(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn sanitize_file_name(file_name: &str) -> Result<String, String> {
    let trimmed = file_name.trim();
    if trimmed.is_empty() {
        return Err("ファイル名が空です".to_string());
    }

    let sanitized = trimmed
        .chars()
        .map(|ch| match ch {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            _ => ch,
        })
        .collect::<String>();

    if sanitized == "." || sanitized == ".." {
        return Err("危険なファイル名です".to_string());
    }

    Ok(sanitized)
}

fn write_dir_to_zip(zip: &mut ZipWriter<File>, root: &Path, current: &Path) -> Result<(), String> {
    let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    for entry in fs::read_dir(current).map_err(|err| err.to_string())? {
        let entry = entry.map_err(|err| err.to_string())?;
        let path = entry.path();
        let name = path
            .strip_prefix(root)
            .map_err(|err| err.to_string())?
            .to_string_lossy()
            .replace('\\', "/");

        if path.is_dir() {
            zip.add_directory(format!("{name}/"), options)
                .map_err(|err| err.to_string())?;
            write_dir_to_zip(zip, root, &path)?;
        } else {
            zip.start_file(name, options).map_err(|err| err.to_string())?;
            let mut file = File::open(&path).map_err(|err| err.to_string())?;
            let mut buffer = Vec::new();
            file.read_to_end(&mut buffer).map_err(|err| err.to_string())?;
            zip.write_all(&buffer).map_err(|err| err.to_string())?;
        }
    }

    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            startup_document,
            open_local_path,
            check_and_cache_url,
            export_cache_zip,
            import_cache_zip,
            save_with_template
        ])
        .run(tauri::generate_context!())
        .expect("error while running RoDots");
}
