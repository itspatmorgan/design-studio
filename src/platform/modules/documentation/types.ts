// One human chapter from src/platform/modules/documentation/pages/<slug>.md.
export type ManualPage = {
  slug: string; // its address, /documentation/manual/<slug>: the file name without .md, e.g. "prototypes"
  title: string;
  description: string;
  section: string | null; // sidebar heading, e.g. "Core concepts"
  source?: string; // the chapter’s source, like "/platform/modules/documentation/pages/prototypes.md"
};

// What build.ts contributes to the manifest as manifest.contributions.documentation.
export type DocumentationContribution = { manual: ManualPage[] };
