# __LABEL__

A module for Design Studio. It adds a page at `/__ID__` and a button for it on the rail.

- `module.ts` says what it is and what it adds.
- `app.tsx` is the page and the rail button.
- `context/` holds knowledge and requirements for this capability.
- [Use __LABEL__](skills/use-__ID__/SKILL.md) is its task procedure. AGENTS.md routes agents to it while the module is enabled.

This README is the entry point and technical contract. The shared Context and Skills browser reads the original module files. See the [module contract](../../platform/context/modules.md) for extension details.

To use it in another Design Studio, publish this folder as a git repository and run `pnpm studio add <address>` there.
To check it before that, run `pnpm check`.
