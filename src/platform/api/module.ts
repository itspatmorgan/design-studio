// #studio/module: what a module declares and provides, and the studio's identity.
// Team modules (src/modules/<id>/) import platform code only through #studio/* (src/platform/context/modules.md).
// Type imports are safe anywhere; the identity values read the app's configuration, so import them in app code only.
import { CONFIG as STUDIO_CONFIG } from '../app/data/config.ts';
import type { StudioConfig } from '../core/config.ts';

/** @stable The declaration a module's module.ts exports as its default. */
export type { ModuleSpec } from '../core/modules/index.ts';
/** @stable The routes a module's server.ts adds to the dev server, by name. */
export type { ModuleServer } from '../core/modules/index.ts';
/** @stable One dev server route: it receives the caller and the request body and returns the reply. */
export type { ServerRoute } from '../core/modules/index.ts';
/** @stable The default export of a module's check.ts, run by pnpm check while the module is enabled. */
export type { ModuleCheck } from '../core/modules/index.ts';
/** @stable What a module's app.tsx adds to the app: rail button, routes, home block, palette and menu entries. */
export type { ModuleApp } from '../app/modules.ts';
/** @stable What palette entries receive: the manifest, the open prototype and navigation. */
export type { PaletteContext } from '../app/modules.ts';
/** @stable One entry a module adds to a prototype's menu. */
export type { PrototypeAction } from '../app/modules.ts';
/** @stable The platform contract version this copy offers; a module's `requires` names the oldest it works with. */
export { PLATFORM_VERSION } from '../core/modules/index.ts';
/** @stable The studio's name, from studio.config.json. */
export { APP_NAME } from '../app/data/config.ts';
/** @stable The studio's tagline from studio.config.json, if it has one. */
export { TAGLINE } from '../app/data/config.ts';

type ReadOnly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends object
    ? { readonly [K in keyof T]: ReadOnly<T[K]> }
    : T;
/** @stable The studio's resolved settings, read-only. */
export const CONFIG: ReadOnly<StudioConfig> = STUDIO_CONFIG;
