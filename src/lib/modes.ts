export type AppMode = 'view' | 'split' | 'edit';

export type StartupMode = 'normal' | 'view' | 'rock';

export function nextMode(mode: AppMode): AppMode {
  if (mode === 'view') return 'split';
  if (mode === 'split') return 'edit';
  return 'view';
}

export function modeLabel(mode: AppMode): string {
  if (mode === 'view') return 'View';
  if (mode === 'edit') return 'Edit';
  return 'Split';
}
