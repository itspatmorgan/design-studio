// #studio/ui: the shell's building blocks a module renders with: navigation, home blocks, collections, documents
// and source editing. Studio's interface components are #studio/components. Browser code only.
/** What a module's app.tsx adds to the app: rail button, routes, home block, palette and menu entries. */
export type { ModuleApp } from '../app/modules.ts';
/** What palette entries receive: the manifest, the open prototype and navigation. */
export type { PaletteContext } from '../app/modules.ts';
/** One entry a module adds to a prototype's menu. */
export type { PrototypeAction } from '../app/modules.ts';
/** The shell's not-found page. */
export { NotFound } from '../app/shell/NotFound.tsx';
/** A section's side navigation and its parts. */
export {
  SectionNav,
  NavHeader,
  NavTitle,
  NavList,
  NavGroup,
  navLinkClass,
  navLinkStyle,
} from '../app/shell/nav/index.ts';
/** Arranges menu items into groups with dividers, dropping the ones that don't apply. */
export { menuGroups } from '../app/shell/menuGroups.ts';
/** A contributor's photo or initials. */
export { ContributorAvatar } from '../app/shell/ContributorAvatar.tsx';
/** A module's block on the home page, with a link to its section. */
export { HomeSection } from '../app/items/HomeSection.tsx';
/** A short hint for an empty home block. */
export { HomeHint } from '../app/items/HomeSection.tsx';
/** A section's list of items as cards or rows, with its view toggle and archived heading. */
export { Collection, ViewToggle, ArchivedHeading } from '../app/items/Collection.tsx';
/** One item in a Collection's card view. */
export { CollectionCard } from '../app/items/CollectionCard.tsx';
/** One item in a Collection's list view, or in a home block. */
export { ItemRow } from '../app/items/ItemRow.tsx';
/** A compiled Markdown page with its title, description and table of contents. */
export { DocLayout } from '../app/docs/DocLayout.tsx';
/** The app path relative links in a shown document resolve from. */
export { DocBase } from '../app/docs/DocBase.ts';
/** Document typography for rendered content. */
export { Prose } from '../app/docs/Prose.tsx';
/** The source editor, given file access and a language. */
export { default as SourceEditor } from '../core/source/SourceEditor.tsx';
/** The file access and permission a SourceEditor is given. */
export type { SourceAccess } from '../core/source/access.ts';
/** A language the SourceEditor highlights. */
export type { SourceLanguage } from '../core/source/SourceEditor.tsx';
/** A prototype file's source editor, with read and write access and permissions resolved. */
export { default as ArtifactSource } from '../app/source/ArtifactSource.tsx';
/** The Source view toggle state, its shortcut and focus return, for a file page. */
export { useSourceView } from '../core/source/useSourceView.ts';
/** The authorized settings editor with stale-snapshot handling and restart coordination. */
export { useStudioSettings } from '../app/settings/useStudioSettings.ts';
/** Lazy Mermaid rendering shared by document content and standalone diagrams. */
export { MermaidDiagram } from '../app/diagrams/MermaidDiagram.tsx';

/** Shared artifact preparation and presentation; callers retain mounting and visibility policy. */
export { ArtifactHost } from '../app/artifacts/ArtifactHost.tsx';
/** Artifact host layout, interaction, and admission inputs. */
export type { ArtifactHostProps } from '../app/artifacts/ArtifactHost.tsx';

/** Shared file navigation with explicit owner creation, bundle and permission policies. */
export { default as FileTree } from '../app/files/FileTree.tsx';
/** Owner policies and props for shared file navigation. */
export type { FileTreePolicy, FileTreeProps, NewFileOption } from '../app/files/FileTree.tsx';
/** Copyable error presentation for file-backed surfaces. */
export { default as FileError } from '../app/files/FileError.tsx';
