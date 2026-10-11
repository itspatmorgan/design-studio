// #studio/system: what a team system's system.ts and intro.tsx declare (src/platform/modules/systems/README.md).
// Team systems (src/systems/<id>/) import platform code only through #studio/*. Import these with `import type`.

/** @stable The declaration a system's system.ts exports as its default. */
export type { SystemSpec } from '../modules/systems/spec.ts';
/** @stable One library a system exposes to its prototypes, listed in SystemSpec.libraries. */
export type { SystemLibrary } from '../modules/systems/spec.ts';
/** @stable A color mode a system supports, listed in SystemSpec.colorModes. */
export type { ColorMode } from '../modules/systems/spec.ts';
/** @stable How the build treats undocumented components: SystemSpec.docs. */
export type { DocsMode } from '../modules/systems/spec.ts';
/** @stable The authored overview a system's intro.tsx exports as its default. */
export type { SystemIntro } from '../app/data/types.ts';
/** @stable The authored overview copy inside SystemIntro.overview. */
export type { SystemOverviewSummary } from '../app/data/types.ts';
/** @stable The curation record inside SystemOverviewSummary.curation. */
export type { SystemCuration } from '../app/data/types.ts';
