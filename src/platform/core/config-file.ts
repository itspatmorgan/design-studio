// The pure parts of reading and writing studio.config.json: parse it, change values, and write it back the same way
// every time. Nothing here touches files, so each rule is tested (config-file.test.ts). Writers read the parsed object,
// change it here, and write the text this returns, so a change to one setting changes only that setting's lines.
import { CONFIG_KEYS, CONFIG_FILE, type StudioConfig } from './config.ts';

// The file's text as a config object, or what is wrong with it. This only parses; configProblems checks the rules.
export function parseConfigFile(text: string): { value: StudioConfig } | { error: string } {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    return { error: `${CONFIG_FILE} is not valid JSON: ${(error as Error).message}` };
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return { error: `${CONFIG_FILE} must be a JSON object.` };
  const repeated = repeatedKey(text);
  if (repeated) return { error: `${CONFIG_FILE} declares "${repeated}" more than once. Remove the duplicate.` };
  return { value: value as StudioConfig };
}

// JSON.parse keeps the last of a repeated key, which would hide a mistake and then be written back without the other.
// The first key an object repeats, at any depth, or null. Text that parsed is well formed, so tokens are enough.
function repeatedKey(text: string): string | null {
  const stack: (Set<string> | null)[] = [];
  for (const token of text.matchAll(/"(?:\\[\s\S]|[^"\\])*"|[{}[\]]/g)) {
    const t = token[0];
    if (t === '{') stack.push(new Set());
    else if (t === '[') stack.push(null);
    else if (t === '}' || t === ']') stack.pop();
    else {
      const keys = stack.at(-1);
      if (keys && /^\s*:/.test(text.slice(token.index! + t.length))) {
        const key = JSON.parse(t) as string;
        if (keys.has(key)) return key;
        keys.add(key);
      }
    }
  }
  return null;
}

// The text to write for a config: 2-space JSON with a trailing newline, keys in the order the object holds them.
export const serializeConfig = (config: Partial<StudioConfig>): string => `${JSON.stringify(config, null, 2)}\n`;

// The config with `changes` applied, as a new object. A setting that is already there keeps its place; a new one goes
// after the nearest setting that precedes it in CONFIG_KEYS, so a file keeps the order readers expect. A value of
// undefined removes the setting.
export function withSettings(config: Partial<StudioConfig>, changes: Partial<Record<keyof StudioConfig, unknown>>) {
  const out: Record<string, unknown> = { ...config };
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined) {
      delete out[key];
      continue;
    }
    if (Object.hasOwn(out, key)) {
      out[key] = value;
      continue;
    }
    const order = (CONFIG_KEYS as readonly string[]).indexOf(key);
    const keys = Object.keys(out);
    let at = 0;
    keys.forEach((existing, index) => {
      if ((CONFIG_KEYS as readonly string[]).indexOf(existing) < order) at = index + 1;
    });
    const entries = Object.entries(out);
    entries.splice(at, 0, [key, value]);
    for (const existing of keys) delete out[existing];
    for (const [name, entry] of entries) out[name] = entry;
  }
  return out as Partial<StudioConfig>;
}

// The config with one module turned on or off, or, with null, with its entry removed.
export function withModule(config: Partial<StudioConfig>, id: string, on: boolean | null): Partial<StudioConfig> {
  const modules = { ...config.modules };
  if (on === null) delete modules[id];
  else modules[id] = on;
  return withSettings(config, { modules });
}
