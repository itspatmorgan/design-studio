import { fileURLToPath } from 'node:url';
import type { ModuleServer } from '../../platform/core/modules/index.ts';
import { claimWelcome } from './node/progress.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
export default {
  progress: ({ me, body }) => {
    if (!body || typeof body !== 'object' || Array.isArray(body))
      return { status: 400, body: { error: 'Invalid Welcome request.' } };
    const request = body as Record<string, unknown>;
    if (request.action !== 'claim' || Object.keys(request).some(key => key !== 'action')) {
      return { status: 400, body: { error: 'Invalid Welcome request.' } };
    }
    try {
      return { body: { show: claimWelcome(root, me) } };
    } catch (error) {
      if (error instanceof Error && 'status' in error && error.status === 422) {
        return { status: 422, body: { error: error.message } };
      }
      throw error;
    }
  },
} satisfies ModuleServer;
