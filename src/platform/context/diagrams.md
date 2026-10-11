---
title: "Diagrams and code formatting"
---

Mermaid blocks render automatically in the Manual, system context, reference pages, and prototype Documents. Write standard Mermaid syntax inside a fenced `mermaid` code block. Use the full view's source control to read or copy the diagram text.

The starter uses platform neutrals for structural diagrams and Flexoki accents for categories and chart series. Document code and the source editor share those accents. Change the platform's light or dark mode to preview both appearances.

Standalone prototype diagrams use the optional [Diagrams module](/documentation/context/module.diagrams). They share this renderer and theme; Markdown fences remain available when that module is disabled.

## Flowchart

```mermaid
flowchart LR
  accTitle: Review feedback
  accDescr: Feedback is reviewed. Actionable feedback becomes a task; other feedback is kept for later.
  A[Collect feedback] --> B{Ready to act?}
  B -->|Yes| C[Create a task with supporting context]
  B -->|Later| D[Keep for review]
```

## Sequence

```mermaid
sequenceDiagram
  accTitle: Save a document
  accDescr: An author edits a document, the studio writes it to disk, and the reader displays the saved version.
  participant Author
  participant Studio
  participant Files
  Author->>Studio: Save document
  Studio->>Files: Write Markdown
  Files-->>Studio: Saved
  Studio-->>Author: Display updated document
```

## State

```mermaid
stateDiagram-v2
  accTitle: Document editing states
  accDescr: A document moves from reading to editing, then saving, and returns to reading.
  [*] --> Reading
  Reading --> Editing: Edit source
  Editing --> Saving: Save
  Saving --> Reading: Done
  Editing --> Reading: Discard changes
```

## Entity relationships

```mermaid
erDiagram
  accTitle: Prototype content
  accDescr: A contributor owns prototypes. Each prototype contains views and documents.
  CONTRIBUTOR ||--o{ PROTOTYPE : owns
  PROTOTYPE ||--o{ VIEW : contains
  PROTOTYPE ||--o{ DOCUMENT : contains
```

## User journey

```mermaid
journey
  accTitle: Explore a prototype
  accDescr: A designer creates a prototype and adds context. A reviewer explores it and gives feedback. Scores are illustrative.
  title Explore a prototype
  section Prepare
    Create prototype: 5: Designer
    Add context: 4: Designer
  section Review
    Explore the views: 5: Reviewer
    Give feedback: 4: Reviewer
```

## Categories

Color distinguishes categories. Labels preserve the meaning without relying on color alone.

```mermaid
pie showData
  accTitle: Example feedback categories
  accDescr: Illustrative feedback includes 12 usability observations, 8 feature requests, and 5 bugs.
  title Feedback categories
  "Usability" : 12
  "Feature requests" : 8
  "Bugs" : 5
```

## Chart series

```mermaid
xychart-beta
  accTitle: Example review activity
  accDescr: Illustrative weekly counts compare feedback received, shown as bars, with feedback reviewed, shown as a line.
  title "Review activity"
  x-axis [Week1, Week2, Week3, Week4]
  y-axis "Feedback items" 0 --> 20
  bar [12, 18, 15, 20]
  line [10, 15, 14, 18]
```

## Document code

The same Flexoki color roles appear in highlighted code and the source editor. Language grammars can classify a token differently, so individual tokens may differ.

```ts
// Keep the next step explicit.
export function nextStep(actionable: boolean, count = 3) {
  const label = "Review feedback";
  return actionable ? { label, count } : null;
}
```

## Customize the defaults

Studio owners can edit `src/platform/systems/studio/styles/contentPalette.js` to change the shared accent palette and document syntax color roles. The source editor reads the same palette.

Edit `src/platform/app/diagrams/mermaidTheme.ts` for diagram color roles and `MermaidDiagram.tsx` for renderer defaults. Diagram neutrals resolve from the platform's current CSS theme. The renderer keeps theme and security defaults under platform control. Authors can still use Mermaid's supported diagram styles, such as flowchart `classDef`, to communicate specific meaning.

Support follows the bundled Mermaid version. These examples cover common foundations, not every diagram type or syntax feature. Additional Mermaid integrations, such as external layouts or icon packs, may require platform configuration. Excalidraw uses its own rendering.
