import { fileURLToPath } from 'node:url';
import type { ModuleServer } from '../../core/modules/index.ts';
import { createSystem } from './node/create-system.js';
import { systemAction } from '../../node/lib/system-actions.js';
const root = fileURLToPath(new URL('../../../../', import.meta.url));
export default {
  action: async ({ me, body }) => {
    try {
      return { body: await systemAction(root, me, body) };
    } catch (error) {
      const status =
        error instanceof Error && 'status' in error && typeof error.status === 'number' ? error.status : 400;
      return { status, body: { error: error instanceof Error ? error.message : 'Could not update the system.' } };
    }
  },
  create: async ({ me, body }) => {
    try {
      return { body: await createSystem(root, me, body) };
    } catch (error) {
      const status =
        error instanceof Error && 'status' in error && typeof error.status === 'number' ? error.status : 400;
      return { status, body: { error: error instanceof Error ? error.message : 'Could not create the system.' } };
    }
  },
} satisfies ModuleServer;
