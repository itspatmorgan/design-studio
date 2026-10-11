import type { ModuleCheck } from '../../platform/core/modules/index.ts';
import { readContributors } from '../../platform/node/lib/contributors.js';

// Runs only while Onboarding is enabled. Disabled modules retain their profile state.
export default (({ root }) => {
  const { contributors } = readContributors(root);
  return Object.entries(contributors as Record<string, { welcomeDismissed?: unknown }>).flatMap(([key, person]) =>
    typeof person?.welcomeDismissed === 'boolean'
      ? []
      : [`Contributor "${key}": declare welcomeDismissed explicitly as false or true in their profile.`],
  );
}) satisfies ModuleCheck;
