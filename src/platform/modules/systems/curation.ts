export function curationPrompt({
  system,
  label,
  path,
  preset,
  designMd = '',
  materials = '',
  components = '',
}: {
  system: string;
  label: string;
  path: 'shadcn' | 'import';
  preset: string;
  designMd?: string;
  materials?: string;
  components?: string;
}): string {
  const skill = `Use the setup-design-system skill for system “${system}”.`;
  const context = materials.trim()
    ? `\n\n${path === 'import' ? 'Source' : 'I want to build'}:\n${materials.trim()}`
    : '';
  if (path === 'import')
    return `Assess my existing React system for “${label}” and suggest what to bring into Studio first.${context}\n\n${skill} Show me the plan before importing.`;
  const choice = preset.trim() ? `\n\nPreset: ${preset.trim()}` : designMd.trim() ? '' : '\n\nHelp me choose a preset.';
  const guidance = designMd.trim() ? `\n\nUse this DESIGN.md as my design direction: ${designMd.trim()}` : '';
  const requested = components.trim() ? `\n\nPlease include: ${components.trim()}` : '';
  return `Help me set up “${label}” using shadcn/ui.${choice}${guidance}${context}${requested}\n\n${skill} Start with the theme and assets, and show them in Studio for my review.`;
}
