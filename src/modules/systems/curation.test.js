import assert from 'node:assert/strict';
import { test } from 'node:test';
import { curationPrompt, sourceUrl } from './curation.ts';

test('source links reject executable and local URLs', () => {
  for (const value of ['javascript:alert(1)', 'file:///tmp/theme.css', 'data:text/html,x', '/systems/example']) assert.equal(sourceUrl(value),null);
  assert.equal(sourceUrl('https://ui.shadcn.com/create?preset=chosen'),'https://ui.shadcn.com/create?preset=chosen');
});

test('resuming an assessment keeps the production import boundary', () => {
  const prompt=curationPrompt({system:'example',label:'Example',path:'shadcn',preset:'',curation:{stage:'assessment',summary:'Fonts are available; components need review.',nextStep:'Inspect the provider dependencies.',sources:[],record:'curation.md'}});
  assert.match(prompt,/context\/curation.md/);
  assert.match(prompt,/Do not import production code without authorization/);
  assert.match(prompt,/Inspect the provider dependencies/);
  assert.doesNotMatch(prompt,/Recommend a starting direction/);
});
