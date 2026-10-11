// Reading and answering the app's requests.
// Part of the dev server's file layer (scripts/build/vite-files-plugin.js).
import { MAX_SOURCE_BYTES } from './paths.js';

// Only the app's own page may call these: browsers mark same-origin requests.
export const sameOrigin = req => req.headers['sec-fetch-site'] === 'same-origin';

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 2 * MAX_SOURCE_BYTES) return {}; // far more than any file we save
  }
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}
