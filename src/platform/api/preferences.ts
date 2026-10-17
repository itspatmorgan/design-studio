// #studio/preferences: Node-only, actor-scoped module preference transactions.
/** Reads a declared, enabled module namespace and its source version. Actor comes from the trusted identity resolver. */
export { readContributorPreferences } from '../node/lib/contributor-preferences.js';
/** Updates only the caller's module namespace, with authorization, validation and optimistic concurrency; omitted fields are retained. */
export { updateContributorPreferences } from '../node/lib/contributor-preferences.js';
