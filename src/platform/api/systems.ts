// #studio/systems: application system queries and themed rendering. Prototype runtime code uses its assigned system libraries.
/** Registered system declarations, filtered by role or active/archived status. Returned values do not expose registry state. */
export { getSystems, getSystem } from '../app/data/systemServices.ts';
/** Configured creation default and required platform system source keys. */
export { defaultSystemKey, platformSystemKey } from '../app/data/systemServices.ts';
/** Permanent system routes and identity-to-source lookup. */
export { systemPath, systemKeyFromIdentity, getSystemSource } from '../app/data/systemServices.ts';
/** Registered system information including its repository source directory. */
export type { SystemInfo } from '../app/data/systemServices.ts';
/** Applies a registered theme’s supported color mode to rendered content. */
export { ThemeScope } from '../app/systems/ThemeScope.tsx';
