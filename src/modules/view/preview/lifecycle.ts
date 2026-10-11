import { compiledLifecycle, type ArtifactLifecycle } from '@/platform/core/artifact-lifecycle/index';
import type { Target } from './protocol';

export function previewLifecycle(target: Target, publish: (state: ArtifactLifecycle) => void) {
  return compiledLifecycle(
    { contributor: target.contributor, prototype: target.prototype, path: target.artifact },
    publish,
  );
}
