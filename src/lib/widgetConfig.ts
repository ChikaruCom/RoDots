export type GadgetId =
  | 'breadcrumbs'
  | 'fileTemplates'
  | 'ambientTimer'
  | 'cacheActions'
  | 'openLocation'
  | 'modeSwitch'
  | 'themeToggle'
  | 'today'
  | 'clock';

export type GadgetZone = 'headerLeft' | 'headerRight' | 'footerLeft' | 'footerRight';

export type GadgetConfig = {
  id: GadgetId;
  zone: GadgetZone;
  visible: boolean;
};

export const gadgets: GadgetConfig[] = [
  { id: 'breadcrumbs', zone: 'headerLeft', visible: true },
  { id: 'fileTemplates', zone: 'headerRight', visible: true },
  { id: 'openLocation', zone: 'headerRight', visible: true },
  { id: 'ambientTimer', zone: 'headerRight', visible: true },
  { id: 'cacheActions', zone: 'headerRight', visible: true },
  { id: 'themeToggle', zone: 'headerRight', visible: true },
  { id: 'modeSwitch', zone: 'headerRight', visible: true },
  { id: 'today', zone: 'footerLeft', visible: true },
  { id: 'clock', zone: 'footerRight', visible: true },
];
