// studio.config.json (at the repo root) as the app reads it. Vite imports the JSON as data; tsconfig.app.json's
// resolveJsonModule types it, and the cast says it is the StudioConfig that configProblems checks at build time.
import file from '../../../../studio.config.json';
import { isEnabled as enabled, type StudioConfig } from '@/platform/core/config';
import directory from 'virtual:studio-resource-directory';
import { resolveStudioReferences } from '@/platform/core/resourceReferences';

const config = file as StudioConfig;
export const CONFIG: StudioConfig = resolveStudioReferences(config, directory);
export const APP_NAME = config.name;
export const TAGLINE = config.tagline;
export const isEnabled = (id: string) => enabled(config, id);
