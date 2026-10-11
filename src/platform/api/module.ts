// #studio/module: module declarations and the platform version. Safe in browser and Node code.
// Team modules (src/modules/<id>/) import platform code only through #studio/* (src/platform/context/modules.md).

/** @stable The declaration a module's module.ts exports as its default. */
export type { ModuleSpec } from '../core/modules/index.ts';
/** @stable The routes a module's server.ts adds to the dev server, by name. */
export type { ModuleServer } from '../core/modules/index.ts';
/** @stable One dev server route: it receives the caller and the request body and returns the reply. */
export type { ServerRoute } from '../core/modules/index.ts';
/** @stable The default export of a module's check.ts, run by pnpm check while the module is enabled. */
export type { ModuleCheck } from '../core/modules/index.ts';
/** @experimental The default export of a module's build.ts: the data it adds to the manifest, folders the dev server watches, and the source files it exposes. */
export type { ModuleBuild } from '../core/modules/index.ts';
/** @stable The platform contract version this copy offers; a module's `requires` names the oldest it works with. */
export { PLATFORM_VERSION } from '../core/modules/index.ts';
