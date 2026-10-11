// The version of each stored format the team owns: studio.config.json, a prototype's meta.json, and a contributor's
// profile. Each file declares the version it was written in as a top-level `formatVersion`, so the first format change
// after release can add a migration that knows what it upgrades from. A missing or unknown version is a validation
// error that names the file. The canvas file already carries its own `studioVersion` (src/platform/modules/canvas/slim.ts)
// because it is an Excalidraw scene whose other fields belong to Excalidraw. See Format versions in context/formats.md.
export const FORMAT_VERSIONS = {
  config: 1,
  prototype: 1,
  contributor: 1,
} as const;

export type FormatName = keyof typeof FORMAT_VERSIONS;

// What is wrong with a file's declared version, as a sentence that names the file and says what to do, or null when the
// version is the current one. `file` is the path as a person knows it.
export function formatVersionProblem(value: unknown, format: FormatName, file: string): string | null {
  const current = FORMAT_VERSIONS[format];
  if (value === undefined) return `${file}: add "formatVersion": ${current}, the version of this file's format.`;
  if (value === current) return null;
  return `${file}: formatVersion is ${JSON.stringify(value)}, but this studio reads version ${current}. ${
    typeof value === 'number' && value > current
      ? 'The file was written by a newer studio; update this one.'
      : 'Set it to the current version.'
  }`;
}
