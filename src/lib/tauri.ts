import { invoke } from '@tauri-apps/api/core';

export type LinkState = 'pending' | 'ok' | 'error';

export type CacheResult = {
  url: string;
  status: number | null;
  ok: boolean;
  cached_at: string | null;
  cache_path: string | null;
  error: string | null;
};

export type StartupDocument = {
  path: string | null;
  content: string | null;
  view_mode: boolean;
  rock_mode: boolean;
};

export async function openLocalPath(target: string, baseDir?: string): Promise<string> {
  return invoke('open_local_path', { target, baseDir });
}

export async function openCurrentFileDirectory(currentFile: string): Promise<string> {
  return invoke('open_current_file_directory', { currentFile });
}

export async function openAppDirectory(): Promise<string> {
  return invoke('open_app_directory');
}

export async function openCacheDirectory(): Promise<string> {
  return invoke('open_cache_directory');
}

export async function getPortableConfig(): Promise<string | null> {
  return invoke('portable_config');
}

export async function registerRdotFileAssociation(): Promise<string> {
  return invoke('register_rdot_file_association');
}

export async function checkAndCacheUrl(url: string): Promise<CacheResult> {
  return invoke('check_and_cache_url', { url });
}

export async function exportCacheZip(destinationFile: string): Promise<string> {
  return invoke('export_cache_zip', { destinationFile });
}

export async function importCacheZip(sourceFile: string): Promise<string> {
  return invoke('import_cache_zip', { sourceFile });
}

export async function saveWithTemplate(currentFile: string | null, content: string, fileName: string): Promise<string> {
  return invoke('save_with_template', { currentFile, content, fileName });
}

export async function getStartupDocument(): Promise<StartupDocument> {
  return invoke('startup_document');
}
