import type { SystemCuration } from '../../platform/app/data/types';

export const curationStages = [
  { id: 'direction', label: 'Direction' },
  { id: 'foundations', label: 'Foundations' },
  { id: 'components', label: 'Components' },
  { id: 'prototype', label: 'Try a prototype' },
  { id: 'ready', label: 'Refine' },
] as const;

export function sourceUrl(value: string): string | null {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}

export function curationPrompt({ system, label, path, preset, materials = '', curation }: {
  system: string; label: string; path: 'shadcn' | 'untitled' | 'import'; preset: string; materials?: string; curation?: SystemCuration;
}): string {
  const target = `“${label}” (source key: ${system})`;
  const preserve = 'Preserve other systems, existing prototypes, and the default system.';
  if (curation) return `Continue setting up ${target}. Read its intro.tsx curation summary${curation.record ? ` and context/${curation.record}` : ''}, and inspect the actual files before continuing. Current direction: ${curation.summary}\nNext step: ${curation.nextStep}\nUse the setup-design-system skill. ${curation.stage === 'assessment' ? 'Continue the assessment. Do not import production code without authorization. ' : ''}Carry out the next authorized step, then open the relevant Studio pages for my review. Keep the saved direction, source provenance, adaptations, and next action current. ${preserve}`;
  const inputs = materials.trim() ? `\nMy goals and materials:\n${materials.trim()}\n` : '';
  if (path === 'import') return `Assess my existing React design system for ${target}. Ask for an accessible repository, folder, or package. Review components, theme, fonts, icons, images, examples, and dependencies. Classify portable material, bounded adaptations, application-coupled code, and missing evidence. Propose a staged import, including whether foundations can arrive first. Save an assessment summary on this system’s Overview so we can review and resume. Assessment does not authorize importing production code. ${inputs}${preserve}`;
  return `Help me curate ${target} using ${path === 'shadcn' ? 'shadcn/ui' : 'Untitled UI'}. Use the setup-design-system skill. ${path === 'shadcn' ? `Use shadcn’s builder and registry tools. ${preset.trim() ? `My preset code or builder link is: ${preset.trim()}.` : 'Recommend a starting direction with Base UI unless I specify otherwise.'} Generate upstream material in an isolated staging workspace, never initialize shadcn over Studio.` : 'Review the components, theme, assets, and license access before importing selected material.'} ${inputs}Ask only for missing intent or materials, including any design.md. Save our direction and sources on this system’s Overview. Review foundations in the browser, then a small component kit, then a useful prototype. Keep the next action current so we can pause and resume. ${preserve}`;
}
