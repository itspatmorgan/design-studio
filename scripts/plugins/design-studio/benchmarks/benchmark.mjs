import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const EVENTS = [
  'request-start',
  'setup-start',
  'studio-ready',
  'publish-start',
  'public-ready',
  'handoff-ready',
  'publish-end',
  'end',
];
export function recordEvent(file, event, at = new Date().toISOString()) {
  if (!path.isAbsolute(file) || !EVENTS.includes(event) || !Number.isFinite(Date.parse(at)))
    throw new Error('Use an absolute log path, a known event, and an ISO timestamp.');
  const rows = readEvents(file);
  if (rows.some(row => row.event === event)) throw new Error('Event already recorded: ' + event);
  const report = reportEvents([...rows, { event, at }]);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify({ event, at: new Date(at).toISOString() }) + '\n');
  return report;
}
export function readEvents(file) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));
}
export function reportEvents(rows) {
  const times = new Map();
  for (const { event, at } of rows) {
    if (!EVENTS.includes(event) || times.has(event) || !Number.isFinite(Date.parse(at)))
      throw new Error('Invalid or duplicate benchmark event.');
    times.set(event, Date.parse(at));
  }
  const duration = (start, end) => {
    if (!times.has(start) || !times.has(end)) return null;
    if (times.get(end) < times.get(start)) throw new Error('Benchmark end precedes start: ' + end);
    return (times.get(end) - times.get(start)) / 1000;
  };
  return {
    seconds: {
      setup: duration('setup-start', 'studio-ready'),
      deployment: duration('publish-start', 'publish-end'),
      deploymentToPublic: duration('publish-start', 'public-ready'),
      endToEnd: duration('request-start', 'end'),
      requestToPublic: duration('request-start', 'public-ready'),
      afterPublic: duration('public-ready', 'end'),
    },
    events: rows,
  };
}
function main() {
  const [command, file, event, at] = process.argv.slice(2);
  if (command === 'mark') console.log(JSON.stringify(recordEvent(file, event, at), null, 2));
  else if (command === 'report' && path.isAbsolute(file ?? ''))
    console.log(JSON.stringify(reportEvents(readEvents(file)), null, 2));
  else throw new Error('Usage: node benchmark.mjs mark <absolute-jsonl> <event> [ISO-time] | report <absolute-jsonl>');
}
if (process.argv[1] && pathToFileURL(fs.realpathSync(process.argv[1])).href === import.meta.url) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
