import { useRouter } from '@tanstack/react-router';
import { renamePrototype } from '@/platform/app/data/files';
import { setManifest } from '@/platform/app/data/manifest';
import type { PrototypeInfo } from '@/platform/app/data/types';

// Renaming changes the title and source folder. Identity and public URL remain stable.
// Throws the server's message.
export function useRenamePrototype(proto: PrototypeInfo) {
  const router = useRouter();
  return async (change: { title: string }) => {
    const result = await renamePrototype(proto, change);
    setManifest(result.manifest);
    await router.invalidate();
  };
}
