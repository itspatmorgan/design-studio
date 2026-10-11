// Opening is a presentation boundary, independent of admission, saving, and revision freshness.
export const OPENING_WAIT_MS = 2000;
export const OPENING_STATUS_DELAY_MS = 200;

export function openingReady(expected: readonly string[], settled: ReadonlySet<string>, elapsed: number) {
  return elapsed >= OPENING_WAIT_MS || expected.every(id => settled.has(id));
}

// Shared renderer inspection attributes report commits in both local and published previews.
// Unsupported or unresponsive renderers fall through to the bounded wait.
export function settledEmbeds(container: HTMLElement) {
  const settled = new Set<string>();
  for (const embed of container.querySelectorAll<HTMLElement>('[data-canvas-embed-id]')) {
    if (
      embed.querySelector(
        '[data-preview-state="ready"], [data-preview-state="error"], [data-artifact-phase="ready"], [data-artifact-phase="error"], [role="alert"]',
      )
    ) {
      settled.add(embed.dataset.canvasEmbedId!);
    }
  }
  return settled;
}
