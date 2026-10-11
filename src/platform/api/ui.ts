// #studio/ui: the shell's building blocks a module renders with: navigation, home blocks, collections, documents
// and source editing. Studio's interface components are #studio/components. Browser code only.
/** @experimental The shell's not-found page. */
export { NotFound } from '../app/shell/App.tsx';
/** @experimental A section's side navigation and its parts. */
export {
  SectionNav,
  NavHeader,
  NavTitle,
  NavList,
  NavGroup,
  navLinkClass,
  navLinkStyle,
} from '../app/shell/nav/index.ts';
/** @experimental Arranges menu items into groups with dividers, dropping the ones that don't apply. */
export { menuGroups } from '../app/shell/menuGroups.ts';
/** @experimental A contributor's photo or initials. */
export { ContributorAvatar } from '../app/shell/ContributorAvatar.tsx';
/** @experimental A module's block on the home page, with a link to its section. */
export { HomeSection } from '../app/items/HomeSection.tsx';
/** @experimental A short hint for an empty home block. */
export { HomeHint } from '../app/items/HomeSection.tsx';
/** @experimental A section's list of items as cards or rows, with its view toggle and archived heading. */
export { Collection, ViewToggle, ArchivedHeading } from '../app/items/Collection.tsx';
/** @experimental One item in a Collection's card view. */
export { CollectionCard } from '../app/items/CollectionCard.tsx';
/** @experimental One item in a Collection's list view, or in a home block. */
export { ItemRow } from '../app/items/ItemRow.tsx';
/** @experimental A compiled Markdown page with its title, description and table of contents. */
export { DocLayout } from '../app/docs/DocLayout.tsx';
/** @experimental The app path relative links in a shown document resolve from. */
export { DocBase } from '../app/docs/DocBase.ts';
/** @experimental Document typography for rendered content. */
export { Prose } from '../app/docs/Prose.tsx';
/** @experimental The source editor, given file access and a language. */
export { default as SourceEditor } from '../core/source/SourceEditor.tsx';
/** @experimental The file access and permission a SourceEditor is given. */
export type { SourceAccess } from '../core/source/access.ts';
/** @experimental A language the SourceEditor highlights. */
export type { SourceLanguage } from '../core/source/SourceEditor.tsx';
/** @experimental A prototype file's source editor, with read and write access and permissions resolved. */
export { default as ArtifactSource } from '../app/source/ArtifactSource.tsx';
/** @experimental The Source view toggle state, its shortcut and focus return, for a file page. */
export { useSourceView } from '../core/source/useSourceView.ts';
