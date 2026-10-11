import { contentPalette } from '@/platform/systems/studio/styles/contentPalette';

// Mermaid's color derivation needs hex colors. Resolve current platform tokens
// through the browser so studio owners can keep using OKLCH or other CSS colors.
function platformColors() {
  const style = getComputedStyle(document.documentElement);
  const context = document.createElement('canvas').getContext('2d')!;
  const hex = (token: string) => {
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = style.getPropertyValue('--card').trim();
    context.fillRect(0, 0, 1, 1);
    context.fillStyle = style.getPropertyValue(token).trim();
    context.fillRect(0, 0, 1, 1);
    return (
      '#' +
      Array.from(context.getImageData(0, 0, 1, 1).data)
        .slice(0, 3)
        .map(value => value.toString(16).padStart(2, '0'))
        .join('')
    );
  };
  return {
    background: hex('--card'),
    text: hex('--foreground'),
    muted: hex('--muted'),
    border: hex('--border'),
    line: hex('--muted-foreground'),
  };
}

export function mermaidTheme(dark: boolean) {
  const n = platformColors();
  // Diagram boundaries carry meaning. UI divider tokens are too faint for them
  // in dark mode, so blend toward the readable foreground for diagram strokes.
  const mix = (a: string, b: string, weight: number) =>
    '#' +
    [1, 3, 5]
      .map(offset =>
        Math.round(
          parseInt(a.slice(offset, offset + 2), 16) * (1 - weight) + parseInt(b.slice(offset, offset + 2), 16) * weight,
        )
          .toString(16)
          .padStart(2, '0'),
      )
      .join('');
  if (dark) {
    n.border = mix(n.background, n.text, 0.45);
    n.line = mix(n.background, n.text, 0.65);
  }
  const p = contentPalette[dark ? 'dark' : 'light'];
  const accents = [p.blue, p.cyan, p.orange, p.purple, p.green, p.magenta, p.yellow, p.red];
  // Pale category surfaces retain dark/light text contrast while distinguishing groups.
  const tint = (color: string) =>
    '#' +
    [1, 3, 5]
      .map(offset =>
        Math.round(
          parseInt(n.background.slice(offset, offset + 2), 16) * 0.82 +
            parseInt(color.slice(offset, offset + 2), 16) * 0.18,
        )
          .toString(16)
          .padStart(2, '0'),
      )
      .join('');
  return {
    darkMode: dark,
    background: n.background,
    fontFamily: getComputedStyle(document.documentElement).getPropertyValue('--font-sans').trim(),
    fontSize: '14px',
    primaryColor: n.muted,
    secondaryColor: n.muted,
    tertiaryColor: n.background,
    primaryTextColor: n.text,
    secondaryTextColor: n.text,
    tertiaryTextColor: n.text,
    primaryBorderColor: n.border,
    secondaryBorderColor: n.border,
    tertiaryBorderColor: n.border,
    lineColor: n.line,
    textColor: n.text,
    mainBkg: n.muted,
    nodeBorder: n.border,
    clusterBkg: n.background,
    clusterBorder: n.border,
    titleColor: n.text,
    edgeLabelBackground: n.background,
    defaultLinkColor: n.line,
    actorBkg: n.muted,
    actorBorder: n.border,
    actorTextColor: n.text,
    actorLineColor: n.line,
    signalColor: n.line,
    signalTextColor: n.text,
    labelBoxBkgColor: n.background,
    labelBoxBorderColor: n.border,
    labelTextColor: n.text,
    loopTextColor: n.text,
    activationBkgColor: n.muted,
    activationBorderColor: n.border,
    noteBkgColor: n.muted,
    noteBorderColor: n.border,
    noteTextColor: n.text,
    pieTitleTextColor: n.text,
    pieSectionTextColor: n.text,
    pieLegendTextColor: n.text,
    pieStrokeColor: n.background,
    pieOuterStrokeColor: n.border,
    ...Object.fromEntries(accents.map((color, index) => [`pie${index + 1}`, tint(color)])),
    ...Object.fromEntries(accents.map((color, index) => [`cScale${index}`, tint(color)])),
    ...Object.fromEntries(accents.map((_, index) => [`cScaleLabel${index}`, n.text])),
    ...Object.fromEntries(accents.map((color, index) => [`fillType${index}`, tint(color)])),
    ...Object.fromEntries(accents.slice(0, 6).map((color, index) => [`actor${index}`, color])),
    xyChart: {
      backgroundColor: n.background,
      titleColor: n.text,
      xAxisLabelColor: n.text,
      xAxisTitleColor: n.text,
      xAxisTickColor: n.line,
      xAxisLineColor: n.border,
      yAxisLabelColor: n.text,
      yAxisTitleColor: n.text,
      yAxisTickColor: n.line,
      yAxisLineColor: n.border,
      plotColorPalette: accents.join(','),
    },
  };
}
