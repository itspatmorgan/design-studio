type ShortcutEvent = Pick<KeyboardEvent, 'key' | 'code' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'repeat' | 'isComposing' | 'defaultPrevented'>;
export function isDialKitShortcut(event: ShortcutEvent): boolean {
  return !event.defaultPrevented && !event.repeat && !event.isComposing && !event.altKey &&
    (event.metaKey || event.ctrlKey) && event.shiftKey &&
    (event.code === 'Semicolon' || event.key === ';' || event.key === ':');
}
export function dialKitShortcutLabel() {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘⇧;' : 'Ctrl+Shift+;';
}
