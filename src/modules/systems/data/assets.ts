import { systemPath } from './systems';
// Only previewable static files are exposed; source code and HTML are not assets here.
const urls = import.meta.glob<string>(
  '/systems/*/assets/**/*.{svg,png,jpg,jpeg,webp,avif,gif,ico,woff,woff2,ttf,otf}',
  { eager: true, query: '?url', import: 'default' },
);

export type SystemAsset = { path: string; url: string; kind: 'Fonts' | 'Icons' | 'Images' };
export function systemAssets(system: string): SystemAsset[] {
  const prefix = `/systems/${system}/assets/`;
  return Object.entries(urls)
    .filter(([path]) => path.startsWith(prefix))
    .map(([file, url]) => {
      const path = file.slice(prefix.length);
      const kind = /\.(woff2?|ttf|otf)$/i.test(path) ? 'Fonts' : path.split('/').includes('icons') ? 'Icons' : 'Images';
      return { path, url, kind } as SystemAsset;
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}
export const assetLink = (system: string, asset: SystemAsset) =>
  `${systemPath(system)}/${asset.kind.toLowerCase()}/${asset.path.split('/').map(encodeURIComponent).join('/')}`;
