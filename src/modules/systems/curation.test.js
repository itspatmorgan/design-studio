import assert from 'node:assert/strict';
import { test } from 'node:test';
import { curationPrompt, sourceUrl } from './curation.ts';

test('source links reject executable and local URLs', () => {
  for (const value of ['javascript:alert(1)', 'file:///tmp/theme.css', 'data:text/html,x', '/systems/example']) assert.equal(sourceUrl(value),null);
  assert.equal(sourceUrl('https://ui.shadcn.com/create?preset=chosen'),'https://ui.shadcn.com/create?preset=chosen');
});

test('DESIGN.md can establish a direction without a preset and stays out of React assessment', () => {
  const choices = { system: 'example', label: 'Example', preset: '', designMd: '/brand/DESIGN.md' };
  const prompt = curationPrompt({ ...choices, path: 'shadcn' });
  assert.match(prompt, /Use this DESIGN.md as my design direction: \/brand\/DESIGN.md/);
  assert.doesNotMatch(prompt, /Help me choose a preset/);
  assert.doesNotMatch(curationPrompt({ ...choices, path: 'import' }), /DESIGN.md/);
});
