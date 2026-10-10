# Product system

Product is the starter toolkit for product prototypes. Components and their API pages live in `components/`; theme implementation lives in `styles/`.

Read `AGENTS.md` when maintaining Product or working on a prototype assigned to it. Its `context/` folder holds product knowledge; specialized task procedures can live in `skills/` when needed. These folders do not need placeholder documents.

Prototype assignment determines which system applies. The [Systems module](../../modules/systems/README.md) owns assignment and boundary requirements, and its [authoring context](../../modules/systems/context/authoring.md) explains component and theme maintenance.

`components.json` records this system’s upstream shadcn choices. It does not capture all authored theme or component adaptations. System folders are not independent CLI projects; follow the [Systems configuration contract](../../modules/systems/README.md#structure) for isolated generation.
