import assert from 'node:assert/strict';
import { test } from 'node:test';
import { curationPrompt } from './curation.ts';

test('DESIGN.md can establish a direction without a preset and stays out of React assessment', () => {
  const choices = { system: 'example', label: 'Example', preset: '', designMd: '/brand/DESIGN.md' };
  const prompt = curationPrompt({ ...choices, path: 'shadcn' });
  assert.match(prompt, /Use this DESIGN.md as my design direction: \/brand\/DESIGN.md/);
  assert.doesNotMatch(prompt, /Help me choose a preset/);
  assert.doesNotMatch(curationPrompt({ ...choices, path: 'import' }), /DESIGN.md/);
});
