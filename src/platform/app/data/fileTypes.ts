import { compatible } from '@/platform/core/modules';
// The file types installed in the module roots (the modules that have a type.ts): one folder each, found with a glob, so the app
// runs with any of them removed. (src/platform/node/lib/file-types.js finds the same folders for the
// build.) Core code reads types here and never imports a type's folder (src/platform/node/check/check-modules.js).
import { assertUniqueExtensions, matchFileType, type FileTypeSpec } from '@/platform/core/fileTypes';
import { assertFileTypeModule, type FileTypeModule } from '@/platform/app/data/fileTypeModule';
import { MODULES } from '@/platform/app/data/modules';
import { isEnabled } from '@/platform/app/data/config';

// The folder name is the type's id: /platform/modules/view/type.ts → "view".
const idOf = (path: string) => path.split('/').at(-2)!;

const specs = import.meta.glob<FileTypeSpec>('/__studio_modules__/type.ts', { eager: true, import: 'default' });
const modules = import.meta.glob<FileTypeModule>('/__studio_modules__/open.tsx', { eager: true, import: 'default' });

// A type is on when its module is installed and studio.config.json leaves it on (the same rule the build uses).
const on = (path: string) => MODULES.some(m => m.id === idOf(path) && compatible(m)) && isEnabled(idOf(path));

export const FILE_TYPES: Record<string, FileTypeSpec> = Object.fromEntries(
  Object.entries(specs)
    .filter(([path]) => on(path))
    .map(([path, spec]) => [idOf(path), spec]),
);
export const fileTypeModules: Record<string, FileTypeModule> = Object.fromEntries(
  Object.entries(modules)
    .filter(([path]) => on(path))
    .map(([path, module]) => [idOf(path), module]),
);
assertUniqueExtensions(FILE_TYPES);
for (const [id, spec] of Object.entries(FILE_TYPES)) assertFileTypeModule(id, spec, fileTypeModules[id]);

// The id of the type that owns a file, by its extension, or null for a plain file.
export const fileTypeOf = (file: string) => matchFileType(FILE_TYPES, file);

// The types you can make a new file of: those with a template, in the "+" menu.
export const creatableTypes = Object.entries(FILE_TYPES)
  .filter(([id, spec]) => spec.inPrototype === true && spec.capabilities.create && fileTypeModules[id])
  .map(([id, spec]) => ({ id, label: spec.label, extension: spec.extensions[0], icon: fileTypeModules[id].icon }));
