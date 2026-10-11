import { useEffect } from 'react';
import { toast } from '@/platform/systems/studio/components/toast';
export default function SystemActionToast() {
  useEffect(() => {
    const message = sessionStorage.getItem('studio:system-action');
    if (!message) return;
    // Wait until the shell's toast provider has subscribed after a full refresh.
    const timer = setTimeout(() => {
      sessionStorage.removeItem('studio:system-action');
      try {
        toast.add({ title: JSON.parse(message).title });
      } catch {
        /* Ignore stale local state. */
      }
    });
    return () => clearTimeout(timer);
  }, []);
  return null;
}
