// Match the apostrophe key even when Shift changes its reported character to a quote.
export function artifactShortcut(
  event: Pick<KeyboardEvent, 'key' | 'code' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'repeat' | 'isComposing'>,
): 'source' | 'grid' | null {
  if (!(event.metaKey || event.ctrlKey) || event.altKey || event.repeat || event.isComposing) return null;
  if (event.code !== 'Quote' && event.key !== "'" && event.key !== '"') return null;
  return event.shiftKey ? 'grid' : 'source';
}

export const shortcutLabel = (action: 'source' | 'grid' | 'save') => {
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  if (action === 'save') return mac ? '⌘S' : 'Ctrl+S';
  if (action === 'grid') return mac ? "⌘⇧'" : "Ctrl+Shift+'";
  return mac ? "⌘'" : "Ctrl+'";
};

export type PreviewShortcut = 'source' | 'grid' | 'palette' | 'navigation';
// Only these existing Studio commands cross the preview document boundary.
export function previewShortcut(event: Parameters<typeof artifactShortcut>[0]): PreviewShortcut | null {
  const artifact = artifactShortcut(event);
  if (artifact) return artifact;
  if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey || event.repeat || event.isComposing)
    return null;
  if (event.key.toLowerCase() === 'k') return 'palette';
  if (event.key === ';') return 'navigation';
  return null;
}
