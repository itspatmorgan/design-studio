import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { platformReferences } from './platform-references.js';
import { setModuleFolders } from '../../core/roots.ts';

// The same module, found in the team's root and in the supplied root (src/platform/core/roots.ts).
for (const base of ['modules', 'platform/modules'])
  test(`owner overviews retain original sources, related guidance, and capability visibility in ${base}/`, () => {
    setModuleFolders([['example', `src/${base}/example`]]);
    // The platform README, as a link from the module's context/ folder.
    const toPlatform = base === 'modules' ? '../../../platform/README.md' : '../../../README.md';
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-reference-'));
    const write = (file, text) => {
      const target = path.join(root, 'src', file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, text);
    };
    try {
      write('platform/README.md', '# Platform');
      write('platform/context/config.md', '# Configuration');
      write(`${base}/example/README.md`, '# Example');
      write(`${base}/example/extra.md`, '# Additional contract');
      write(
        `${base}/example/context/configure.md`,
        `# Configure\n[Platform](${toPlatform}#context)\n[Additional](../extra.md)\n[Remote](https://example.com/extra.md)`,
      );
      write(`${base}/example/context/example.md`, '# Example workflow\n```md\n[Additional](../extra.md)\n```');
      write('systems/product/README.md', '# Product');
      const systemContent = [
        {
          id: 'module.example:context',
          contributorKey: 'system-content',
          system: 'module.example',
          title: 'Context',
          artifacts: ['configure.md', 'example.md'].map(path => ({ path })),
        },
        {
          id: 'product:context',
          contributorKey: 'system-content',
          system: 'product',
          title: 'Context',
          artifacts: [],
          owner: { kind: 'system', id: 'product', label: 'Product', root: 'src/systems/product' },
        },
      ];
      const modules = [{ id: 'example', label: 'Example', instructions: [{ path: 'context/example.md' }] }];
      const groups = platformReferences({ root, modules, enabled: ['example'], systemContent });
      const core = groups.find(g => g.id === 'core');
      assert.deepEqual(
        core.references.map(r => r.source),
        ['/platform/README.md'],
        'technical Context is read through its own tree',
      );
      assert.deepEqual(
        core.references[0].related.map(r => r.title),
        ['module.example · Context · Configure'],
      );
      assert.ok(
        !groups.some(g => g.id === 'system.product'),
        'system files belong to Systems, not platform documentation',
      );
      const example = groups.find(g => g.id === 'example');
      assert.equal(example.references.find(r => r.source.endsWith('/README.md')).related.length, 1);
      assert.equal(
        example.references.find(r => r.source.endsWith('/extra.md')).related.length,
        1,
        'fenced examples and remote links add no related guidance',
      );
      fs.rmSync(path.join(root, `src/${base}/example/README.md`));
      const missing = platformReferences({ root, modules, enabled: ['example'], systemContent }).find(
        g => g.id === 'example',
      );
      assert.deepEqual(
        missing.references.map(r => r.source),
        [`/${base}/example/extra.md`],
        'other documents retain their own identity without replacing README',
      );
      const disabled = platformReferences({ root, modules, enabled: [], systemContent }).find(g => g.id === 'example');
      assert.deepEqual(disabled.references, []);
    } finally {
      setModuleFolders([]);
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
