export type HeaderWidgetId = 'breadcrumbs' | 'fileTemplates' | 'ambientTimer' | 'cacheActions';

export type HeaderWidgetConfig = {
  id: HeaderWidgetId;
  side: 'left' | 'right';
  visible: boolean;
};

export const headerWidgets: HeaderWidgetConfig[] = [
  { id: 'breadcrumbs', side: 'left', visible: true },
  { id: 'fileTemplates', side: 'right', visible: true },
  { id: 'ambientTimer', side: 'right', visible: true },
  { id: 'cacheActions', side: 'right', visible: true },
];
