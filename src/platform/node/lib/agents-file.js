// AGENTS.md is generated: the platform guidance (src/platform/AGENTS.md), the routing block for the enabled modules, and
// the team's own guidance (AGENTS.team.md). Everything that writes or checks it goes through here.
import fs from 'node:fs';
import path from 'node:path';
import { agentsBlock, composeAgents } from '../../core/modules/pack.ts';

export const PLATFORM_AGENTS = 'src/platform/AGENTS.md';
export const TEAM_AGENTS = 'AGENTS.team.md';

// The complete text AGENTS.md should have for these enabled modules.
export function renderAgents(root, modules, platformId) {
  const platform = path.join(root, PLATFORM_AGENTS);
  if (!fs.existsSync(platform))
    throw new Error(`${PLATFORM_AGENTS} is missing. Restore the upstream project instructions.`);
  const team = path.join(root, TEAM_AGENTS);
  return composeAgents(
    fs.readFileSync(platform, 'utf8'),
    agentsBlock(modules, platformId),
    fs.existsSync(team) ? fs.readFileSync(team, 'utf8') : null,
  );
}
