import { contribution } from '@/platform/app/data/manifest';
import type { Manifest } from '@/platform/app/data/types';
import type { DocumentationContribution, ManualPage } from './types';

// The Manual's chapters in order, from the manifest's Documentation contribution; none when Documentation is off.
export const manualPages = (manifest: Manifest): ManualPage[] =>
  contribution<DocumentationContribution>(manifest, 'documentation')?.manual ?? [];
