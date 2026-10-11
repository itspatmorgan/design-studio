# Team modules

This folder holds your team's own modules, one folder each in `<module folder>/` with a `module.ts`. The modules the starter ships live in `src/platform/modules/` and are updated with the platform. A module's id is its folder name, so a team module can't reuse a supplied module's id.

Make one with `pnpm studio create-module <id>`, or add one from a source with `pnpm studio add <source>`. Read the platform's [module contract](../platform/context/modules.md) before changing packaging, registration, dependencies, or lifecycle behavior. Enabled declarations in `studio.config.ts` determine availability; files alone do not enable a capability.
