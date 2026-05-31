export type GadgetId =
  | 'breadcrumbs'
  | 'fileTemplates'
  | 'ambientTimer'
  | 'cacheActions'
  | 'openLocation'
  | 'openAppLocation'
  | 'openCacheLocation'
  | 'registerFileAssociation'
  | 'modeSwitch'
  | 'themeToggle'
  | 'today'
  | 'clock';

export type GadgetZone = 'headerLeft' | 'headerRight' | 'footerLeft' | 'footerRight' | 'contextMenu';

export type GadgetConfig = {
  id: GadgetId;
  zone: GadgetZone;
  visible: boolean;
};

export const gadgets: GadgetConfig[] = [
  { id: 'breadcrumbs', zone: 'headerLeft', visible: true },
  { id: 'fileTemplates', zone: 'headerRight', visible: true },
  { id: 'openLocation', zone: 'headerRight', visible: true },
  { id: 'openAppLocation', zone: 'contextMenu', visible: true },
  { id: 'openCacheLocation', zone: 'contextMenu', visible: true },
  { id: 'registerFileAssociation', zone: 'contextMenu', visible: true },
  { id: 'ambientTimer', zone: 'headerRight', visible: true },
  { id: 'cacheActions', zone: 'headerRight', visible: true },
  { id: 'themeToggle', zone: 'headerRight', visible: true },
  { id: 'modeSwitch', zone: 'headerRight', visible: true },
  { id: 'today', zone: 'footerLeft', visible: true },
  { id: 'clock', zone: 'footerRight', visible: true },
];
