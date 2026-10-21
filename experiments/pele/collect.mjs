import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const root = new URL('../../', import.meta.url);
const fixtures = [];
async function walk(dir) {
  for (const entry of (await readdir(new URL(dir, root), { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const file = `${dir}/${entry.name}`;
    if (entry.isDirectory()) await walk(file);
    else if (/\.(md|mermaid)$/.test(file)) {
      const text = await readFile(new URL(file, root), 'utf8');
      if (file.endsWith('.mermaid')) fixtures.push({ name: file, source: text, group: 'corpus' });
      else {
        // CommonMark backtick/tilde fences, including longer fences and CRLF.
        const lines = text.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          const open = /^ {0,3}(`{3,}|~{3,})mermaid\s*$/.exec(lines[i]);
          if (!open) continue;
          const start = i + 1,
            body = [];
          const close = new RegExp(`^ {0,3}${open[1][0]}{${open[1].length},}\\s*$`);
          while (++i < lines.length && !close.test(lines[i])) body.push(lines[i]);
          fixtures.push({ name: `${file}:${start}`, source: body.join('\n'), group: 'corpus' });
        }
      }
    }
  }
}
await walk('src');
const stress = {
  'nested-linked-subgraphs':
    'flowchart LR\nsubgraph Outer\n direction TB\n subgraph Inner\n A[Start] --> B[Review]\n end\n C[Approve]\nend\nB --> C\nX[External] --> A\nC --> X',
  'cycles-dense-labels':
    'flowchart LR\n' +
    Array.from(
      { length: 12 },
      (_, i) => `N${i}[Stage ${i}] -->|forward ${i}| N${(i + 1) % 12}\nN${i} -->|cross ${i}| N${(i + 4) % 12}`,
    ).join('\n'),
  'labels-style-unicode':
    'flowchart LR\naccTitle: Review accessibility\naccDescr: A multilingual styled workflow\nA["A very long label that needs room to remain readable"] --> B["Line one<br/>Line two"]\nB --> C["日本語 · العربية · café 🌋"]\nC --> D["`**Bold** and *italic* Markdown`"]\nclassDef accent fill:#d0e5ff,stroke:#205ea6,color:#101010\nclass A accent\nstyle C stroke-width:3px',
  'sequence-80':
    'sequenceDiagram\nparticipant A as Client\nparticipant B as Service\n' +
    Array.from({ length: 80 }, (_, i) => `A->>B: Request ${i}\nB-->>A: Response ${i}`).join('\n'),
  'edges-480':
    'flowchart LR\n' + Array.from({ length: 480 }, (_, i) => `A${i % 40} -->|${i}| A${(i * 7 + 1) % 40}`).join('\n'),
  'frontmatter-init':
    '---\ntitle: Frontmatter title\nconfig:\n  theme: dark\n  securityLevel: loose\n---\n%%{init: {"theme":"dark","securityLevel":"loose"}}%%\nflowchart LR\nA[Alpha] --> B[Beta]',
};
for (const [name, source] of Object.entries(stress)) fixtures.push({ name, source, group: 'stress' });
const policy = {
  'links-directive':
    '%%{init: {"securityLevel":"loose","links":true,"images":true}}%%\nflowchart LR\nA[Alpha] --> B[Beta]\nclick A "https://example.invalid/blocked" "External"\nclick B "javascript:alert(1)" "Unsafe"',
  'relative-link': 'flowchart LR\nA[Alpha]\nclick A "./relative" "Relative"',
  'html-injection': 'flowchart LR\nA["<img src=x onerror=alert(1)><script>alert(1)</script>"]',
  'image-node': 'flowchart LR\nA@{ img: "https://example.invalid/image.png", label: "Image", h: 60 }',
  invalid: 'flowchart LR\nA[unfinished',
  'source-limit': 'flowchart LR\n%%' + 'x'.repeat(50001),
  'edge-limit': 'flowchart LR\n' + Array.from({ length: 501 }, (_, i) => `A --> B${i}`).join('\n'),
  'nesting-80':
    'flowchart TB\n' +
    Array.from({ length: 80 }, (_, i) => `subgraph S${i}`).join('\n') +
    '\nA[Deep]\n' +
    'end\n'.repeat(80),
};
for (const [name, source] of Object.entries(policy)) fixtures.push({ name, source, group: 'policy' });
for (const f of fixtures) f.sha256 = createHash('sha256').update(f.source).digest('hex');
await writeFile(new URL('fixtures.json', import.meta.url), JSON.stringify(fixtures, null, 2) + '\n');
console.log(
  `${fixtures.filter(f => f.group === 'corpus').length} corpus, ${Object.keys(stress).length} stress, ${Object.keys(policy).length} policy fixtures`,
);
