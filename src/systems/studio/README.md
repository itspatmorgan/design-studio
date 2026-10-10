# Studio system

Studio supplies Design Studio's application components, theme, and writing conventions. Prototype runtime code cannot import this application toolkit.

Read `AGENTS.md` and [writing context](context/writing.md) for Studio interface work. Components and their API pages live in `components/`; theme implementation lives in `styles/`.

Platform operating context and skills belong to the [platform](../../platform/README.md). Design-system authoring procedures belong to the [Systems module](../../modules/systems/README.md). Studio currently has no specialized system skills.

`components.json` records this system’s upstream shadcn choices. It does not capture all authored theme or component adaptations. System folders are not independent CLI projects; follow the [Systems configuration contract](../../modules/systems/README.md#structure) for isolated generation.
