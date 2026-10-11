import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// Edit properties of a TypeScript declaration (a system.ts or module.ts) in place; preserve all other properties and
// source comments. studio.config.json is plain JSON and is edited as an object instead (src/platform/core/config-file.ts).
export function editDeclaration(text, changes) {
  const source = ts.createSourceFile('declaration.ts', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const exported = source.statements.find(ts.isExportAssignment);
  let object = exported?.expression;
  while (
    object &&
    (ts.isSatisfiesExpression(object) || ts.isAsExpression(object) || ts.isParenthesizedExpression(object))
  )
    object = object.expression;
  if (!object || !ts.isObjectLiteralExpression(object) || source.parseDiagnostics.length)
    throw new Error('The declaration must default-export an object. Edit custom computed declarations in your editor.');
  if (object.properties.some(ts.isSpreadAssignment))
    throw new Error('Declare a plain object without spreads so the applied values are unambiguous.');
  const checkNames = object => {
    const names = object.properties.map(property =>
      property.name && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
        ? property.name.text
        : property.name?.getText(source),
    );
    if (new Set(names).size !== names.length)
      throw new Error('Remove duplicate declaration properties before editing it.');
  };
  checkNames(object);
  const literal = value => {
    if (typeof value === 'boolean') return value ? ts.factory.createTrue() : ts.factory.createFalse();
    if (Array.isArray(value))
      return ts.factory.createArrayLiteralExpression(value.map(id => ts.factory.createStringLiteral(id)));
    if (value && typeof value === 'object')
      return ts.factory.createObjectLiteralExpression(
        Object.entries(value).map(([key, next]) =>
          ts.factory.createPropertyAssignment(ts.factory.createStringLiteral(key), literal(next)),
        ),
      );
    return ts.factory.createStringLiteral(value);
  };
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const valueText = value => printer.printNode(ts.EmitHint.Expression, literal(value), source);
  const edits = [];
  function patchObject(object, values) {
    if (!ts.isObjectLiteralExpression(object) || object.properties.some(ts.isSpreadAssignment))
      throw new Error('Configure modules as a plain object without spreads.');
    checkNames(object);
    const remaining = new Map(Object.entries(values));
    for (const property of object.properties) {
      const key =
        property.name && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
          ? property.name.text
          : null;
      if (!remaining.has(key)) continue;
      if (!ts.isPropertyAssignment(property)) throw new Error(`Configure ${key} as a plain property first.`);
      const value = remaining.get(key);
      remaining.delete(key);
      if (key !== 'systemMaintainers' && value && typeof value === 'object' && !Array.isArray(value))
        patchObject(property.initializer, value);
      else
        edits.push({
          start: property.initializer.getStart(source),
          end: property.initializer.end,
          text: valueText(value),
        });
    }
    if (!remaining.size) return;
    const close = object.end - 1;
    const closeLine = text.slice(text.lastIndexOf('\n', close) + 1, close);
    const fields = [...remaining].map(
      ([key, value]) => `${/^[A-Za-z_]\w*$/.test(key) ? key : JSON.stringify(key)}: ${valueText(value)},`,
    );
    if (/^[ \t]*$/.test(closeLine)) {
      const first = object.properties[0]?.getStart(source) ?? object.getStart(source);
      const firstLine = text.slice(text.lastIndexOf('\n', first) + 1, first);
      const indent = /^[ \t]+$/.test(firstLine) ? firstLine : closeLine + '  ';
      edits.push({
        start: close - closeLine.length,
        end: close - closeLine.length,
        text: fields.map(field => indent + field + '\n').join(''),
      });
    } else edits.push({ start: close, end: close, text: ' ' + fields.join(' ') + ' ' });
    const last = object.properties.at(-1);
    if (last && !object.properties.hasTrailingComma) edits.push({ start: last.end, end: last.end, text: ',' });
  }
  patchObject(object, changes);
  return edits
    .sort((a, b) => b.start - a.start)
    .reduce((result, edit) => result.slice(0, edit.start) + edit.text + result.slice(edit.end), text);
}

// Prepare all reads before applying any changes. Same-folder renames prevent truncated files.
export function applySetupChanges(changes) {
  const unchanged = (file, content) => {
    if (!fs.lstatSync(file).isFile() || fs.readFileSync(file, 'utf8') !== content)
      throw new Error(`${file} changed. Review the setup plan again.`);
  };
  const atomicWrite = (file, content) => {
    const temporary = `${file}.studio-${randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temporary, content, { flag: 'wx', mode: fs.statSync(file).mode & 0o777 });
      fs.renameSync(temporary, file);
    } finally {
      fs.rmSync(temporary, { force: true });
    }
  };
  for (const change of changes) {
    unchanged(change.file, change.before);
  }
  const applied = [];
  try {
    for (const change of changes) {
      unchanged(change.file, change.before);
      atomicWrite(change.file, change.after);
      applied.push(change);
    }
  } catch (error) {
    const failures = [];
    for (const change of applied.reverse()) {
      try {
        unchanged(change.file, change.after);
        atomicWrite(change.file, change.before);
      } catch (rollbackError) {
        failures.push(rollbackError);
      }
    }
    if (failures.length)
      throw new AggregateError(
        [error, ...failures],
        'Setup failed and some files could not be restored. Inspect the files before retrying.',
      );
    throw error;
  }
}
