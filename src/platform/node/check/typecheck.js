// Retained prototypes with deleted systems are source for a rebuild, not runnable application entries.
import ts from 'typescript';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { unavailablePrototypeRoots } from '../lib/system-lifecycle.js';
const root = process.cwd();
const unavailable = unavailablePrototypeRoots(root);
const config = ts.readConfigFile(path.join(root, 'tsconfig.app.json'), ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const files = parsed.fileNames.filter(file => !unavailable.some(dir => file.startsWith(dir + path.sep)));
const program = ts.createProgram(files, parsed.options);
const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
if (diagnostics.length) {
  console.error(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: file => file,
      getCurrentDirectory: () => root,
      getNewLine: () => '\n',
    }),
  );
  process.exit(1);
}
execFileSync(process.execPath, [path.join(root, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.node.json'], {
  stdio: 'inherit',
});
