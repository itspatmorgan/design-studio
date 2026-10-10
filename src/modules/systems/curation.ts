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
  const skill = `Use the setup-design-system skill for system “${system}”.`;
  const context = materials.trim() ? `\n\nAdditional context:\n${materials.trim()}` : '';
  if (curation) return [
    `Continue ${curation.stage === 'assessment' ? 'assessing' : 'setting up'} “${label}”.`,
    `Direction: ${curation.summary}\nNext: ${curation.nextStep}`,
    `${skill} Resume from our saved decisions and show me the next result in Studio.`,
  ].join('\n\n');
  if (path === 'import') return `Assess my existing React system for “${label}” and suggest what to bring into Studio first.${context}\n\n${skill} Show me the plan before importing.`;
  const choice = path === 'shadcn'
    ? (preset.trim() ? `\n\nPreset: ${preset.trim()}` : '\n\nHelp me choose a preset.')
    : '';
  return `Help me set up “${label}” using ${path === 'shadcn' ? 'shadcn/ui' : 'Untitled UI'}.${choice}${context}\n\n${skill} Start with the theme and assets, and show them in Studio for my review.`;
}
