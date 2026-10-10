import assert from 'node:assert/strict';
import { test } from 'node:test';
import { curationPrompt, sourceUrl } from './curation.ts';

test('source links reject executable and local URLs', () => {
  for (const value of ['javascript:alert(1)', 'file:///tmp/theme.css', 'data:text/html,x', '/systems/example']) assert.equal(sourceUrl(value),null);
  assert.equal(sourceUrl('https://ui.shadcn.com/create?preset=chosen'),'https://ui.shadcn.com/create?preset=chosen');
});

test('resuming an assessment preserves intent and saved next step', () => {
  const prompt=curationPrompt({system:'example',label:'Example',path:'shadcn',preset:'',curation:{stage:'assessment',summary:'Fonts are available; components need review.',nextStep:'Inspect the provider dependencies.',sources:[],record:'curation.md'}});
  assert.match(prompt,/Continue assessing/);
  assert.match(prompt,/setup-design-system/);
  assert.match(prompt,/saved decisions/);
  assert.match(prompt,/Inspect the provider dependencies/);
  assert.doesNotMatch(prompt,/Recommend a starting direction/);
});

test('DESIGN.md can establish a direction without a preset and stays out of React assessment', () => {
  const choices = { system: 'example', label: 'Example', preset: '', designMd: '/brand/DESIGN.md' };
  const prompt = curationPrompt({ ...choices, path: 'shadcn' });
  assert.match(prompt, /Use this DESIGN.md as my design direction: \/brand\/DESIGN.md/);
  assert.doesNotMatch(prompt, /Help me choose a preset/);
  assert.doesNotMatch(curationPrompt({ ...choices, path: 'import' }), /DESIGN.md/);
});
