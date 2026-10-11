import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { MAX_FILES, MAX_FILE_BYTES, MAX_TOTAL_BYTES, plainPath } from '../../core/modules/pack.ts';

const MAX_EXPANDED = MAX_TOTAL_BYTES + MAX_FILES * 2048 + 1024 * 1024;
const field = buffer => buffer.toString('utf8').replace(/\0.*$/s, '').trim();
const octal = buffer => {
  const value = field(buffer);
  if (!/^[0-7]*$/.test(value)) throw new Error('Unsupported archive number.');
  return parseInt(value || '0', 8);
};

// Validate the bounded, expanded archive in memory before writing anything. No links or sparse files.
export function archiveEntries(compressed) {
  const tar = gunzipSync(compressed, { maxOutputLength: MAX_EXPANDED });
  const entries = [];
  const seen = new Set();
  let total = 0,
    files = 0,
    nextName = null,
    offset = 0;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every(byte => byte === 0)) break;
    const checksum = header.reduce((sum, byte, index) => sum + (index >= 148 && index < 156 ? 32 : byte), 0);
    if (checksum !== octal(header.subarray(148, 156))) throw new Error('Invalid archive checksum.');
    const size = octal(header.subarray(124, 136));
    if (size > MAX_FILE_BYTES) throw new Error('An archive entry is larger than 2 MB.');
    const start = offset + 512;
    offset = start + Math.ceil(size / 512) * 512;
    if (offset > tar.length) throw new Error('The archive is truncated.');
    const data = tar.subarray(start, start + size);
    const type = String.fromCharCode(header[156]);
    if (type === 'L') {
      nextName = field(data);
      continue;
    }
    if (type === 'x' || type === 'g') {
      let at = 0;
      while (at < data.length) {
        const space = data.indexOf(32, at);
        const length = Number(data.subarray(at, space).toString());
        if (space < at || !Number.isInteger(length) || length <= space - at + 1 || at + length > data.length)
          throw new Error('Invalid archive metadata.');
        const record = data.subarray(space + 1, at + length - 1).toString('utf8');
        const equal = record.indexOf('=');
        const key = record.slice(0, equal),
          value = record.slice(equal + 1);
        if (equal < 1 || /sparse|linkpath/i.test(key)) throw new Error('Unsupported archive metadata.');
        if (key === 'path') {
          if (type === 'g') throw new Error('Global archive paths are unsupported.');
          nextName = value;
        }
        if (key === 'size') throw new Error('Archive size overrides are unsupported.');
        at += length;
      }
      continue;
    }
    if (!['0', '\0', '5'].includes(type))
      throw new Error('Archives may contain only regular files and folders, never links.');
    const prefix = field(header.subarray(345, 500));
    const name = (nextName ?? `${prefix ? prefix + '/' : ''}${field(header.subarray(0, 100))}`)
      .replace(/^(\.\/)+/, '')
      .replace(/\/$/, '');
    nextName = null;
    if (!name && type === '5') continue;
    if (!plainPath(name) || seen.has(name)) throw new Error(`Invalid or duplicate archive path: ${name}`);
    if (type === '5' && size) throw new Error('Archive folders must be empty entries.');
    seen.add(name);
    total += size;
    if (type !== '5') files++;
    if (files > MAX_FILES || entries.length >= MAX_FILES * 3 || total > MAX_TOTAL_BYTES)
      throw new Error('The archive exceeds the pack size or file-count limits.');
    entries.push({ name, directory: type === '5', data });
  }
  if (nextName || offset + 512 > tar.length) throw new Error('The archive is truncated.');
  const fileNames = new Set(entries.filter(entry => !entry.directory).map(entry => entry.name));
  for (const entry of entries) {
    const parts = entry.name.split('/');
    for (let i = 1; i < parts.length; i++)
      if (fileNames.has(parts.slice(0, i).join('/'))) throw new Error('An archive file cannot also be a folder.');
  }
  return entries;
}

export function extractArchive(compressed, dir) {
  const entries = archiveEntries(compressed);
  for (const entry of entries) {
    const target = path.join(dir, ...entry.name.split('/'));
    fs.mkdirSync(entry.directory ? target : path.dirname(target), { recursive: true });
    if (!entry.directory) fs.writeFileSync(target, entry.data, { flag: 'wx' });
  }
}

export async function boundedDownload(response, limit) {
  const chunks = [];
  let bytes = 0;
  if (!response.body) throw new Error('The download has no content.');
  for await (const chunk of response.body) {
    bytes += chunk.length;
    if (bytes > limit) throw new Error('The download is larger than 50 MB.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
