// A capability chapter stays in the Manual but is exposed only while its module is enabled.
// Invalid metadata proceeds to manifest validation instead of silently hiding the chapter.
export function manualChapterEnabled(frontmatter, enabled) {
  return typeof frontmatter?.module !== 'string' || enabled.includes(frontmatter.module);
}
