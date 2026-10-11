// The leading --- block of a Markdown file, as simple `key: value` lines. Strings may be quoted
// (a double-quoted one with \" escapes, a single-quoted one with '' for a quote); true, false, and
// numbers are converted; a `>` or `|` block holds a longer text on the indented lines below it.
// Nested values (a `metadata:` map) are skipped. Returns null when there's no closed block.
export function frontmatter(text) {
  const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!block) return null;
  const data = {};
  const lines = block[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^([\w-]+):\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (/^[>|][+-]?$/.test(v)) {
      const folded = v[0] === '>';
      const body = [];
      while (i + 1 < lines.length && (lines[i + 1].trim() === '' || /^\s/.test(lines[i + 1])))
        body.push(lines[++i].trim());
      data[m[1]] = body
        .join(folded ? ' ' : '\n')
        .replace(/\s+$/, '')
        .replace(/ {2,}/g, ' ');
      continue;
    }
    if (/^".*"$/.test(v)) {
      try {
        v = JSON.parse(v);
      } catch {
        v = v.slice(1, -1);
      }
    } // "a \"quoted\" word": escapes read as YAML reads them
    else if (/^'.*'$/.test(v)) v = v.slice(1, -1).replace(/''/g, "'");
    else if (v === 'true' || v === 'false') v = v === 'true';
    else if (v !== '' && !Number.isNaN(Number(v))) v = Number(v);
    data[m[1]] = v;
  }
  return data;
}
