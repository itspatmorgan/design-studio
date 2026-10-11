# Marketing system

Marketing supplies a toolkit and brand guidance for marketing prototypes. Components and their API pages live in `components/`; theme implementation lives in `styles/`.

Read `AGENTS.md` when maintaining Marketing or working on a prototype assigned to it. Context includes [Brand](context/brand.md), [Design](context/design.md), and [Library](context/library.md). Specialized task procedures can live in `skills/` when needed.

Prototype assignment determines which system applies. The [Systems module](../../platform/modules/systems/README.md) owns assignment and boundary requirements.

`components.json` records this system’s upstream shadcn choices. It does not capture all authored theme or component adaptations. System folders are not independent CLI projects; follow the [Systems configuration contract](../../platform/modules/systems/README.md#structure) for isolated generation.
