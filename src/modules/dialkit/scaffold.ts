export type Workspace = { version: 1 };
const marker = /^\/\/ @dialkit (.+)\r?\n/m;
export function readWorkspace(source: string): Workspace | null {
  const header = /^(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\n]*)*/.exec(source)?.[0] ?? '';
  const match = marker.exec(header);
  if (!match) return null;
  try { return JSON.parse(match[1])?.version === 1 ? { version: 1 } : null; }
  catch { return null; }
}
export function scaffoldWorkspace(source: string): string {
  return readWorkspace(source) ? source : '// @dialkit {"version":1}\n' + source;
}
export function removeWorkspace(source: string): string {
  return readWorkspace(source) ? source.replace(marker, '') : source;
}
