import { useEffect, useState } from 'react';
import { useBlocker } from '@tanstack/react-router';
import type { StudioConfig } from '@/platform/core/config';
import { waitForRestart } from './waitForRestart';
import { toast } from '@/platform/systems/studio/components/toast';
import { beginSettingsTransition, finishSettingsTransition } from './restartTransition';

type Snapshot = {
  config: StudioConfig;
  version: string;
  actor: string | null;
  role: 'admin' | 'contributor' | null;
  contributors: { key: string; name: string; github: string }[];
  modules: {
    id: string;
    label: string;
    description?: string;
    optional: boolean;
    compatible: boolean;
    settings?: { group: string; order: number };
  }[];
  systems: { id: string; label: string; status: 'active' | 'archived' }[];
};

export function useStudioSettings(fields: readonly (keyof StudioConfig)[], successTitle = 'Settings saved') {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [draft, setDraft] = useState<StudioConfig | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [restartFrom, setRestartFrom] = useState<string | null>(null);
  const restarting = restartFrom !== null;
  const [conflict, setConflict] = useState(false);
  const dirty = Boolean(draft && snapshot && JSON.stringify(draft) !== JSON.stringify(snapshot.config));
  const blocker = useBlocker({
    shouldBlockFn: () => dirty && !saving,
    enableBeforeUnload: () => dirty && !saving,
    withResolver: true,
  });

  async function load() {
    setError('');
    try {
      const response = await fetch('/__studio/settings');
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setSnapshot(body);
      setDraft(body.config);
      setConflict(false);
      const pendingRuntime = sessionStorage.getItem('studio:settings-saved');
      if (pendingRuntime) {
        if (pendingRuntime === body.runtimeId || body.restarting) setRestartFrom(pendingRuntime);
        else {
          setRestartFrom(null);
          sessionStorage.removeItem('studio:settings-saved');
          requestAnimationFrame(() => {
            finishSettingsTransition();
            toast.add({ title: successTitle });
          });
        }
      } else setRestartFrom(null);
    } catch (cause) {
      finishSettingsTransition();
      setError(cause instanceof Error ? cause.message : 'Settings could not load.');
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (!restartFrom) return;
    const controller = new AbortController();
    void waitForRestart(restartFrom, { signal: controller.signal })
      .then(() => window.location.reload())
      .catch(cause => {
        if (controller.signal.aborted) return;
        setRestartFrom(null);
        finishSettingsTransition();
        setError(
          cause instanceof Error ? cause.message : 'The studio could not restart. Reload settings to check again.',
        );
      });
    return () => controller.abort();
  }, [restartFrom]);
  const editable = snapshot?.role === 'admin';
  const disabled = !editable || saving || restarting;
  const update = (changes: Partial<StudioConfig>) => {
    setDraft(current => current && { ...current, ...changes });
  };

  async function save() {
    if (!draft || !snapshot) return;
    setSaving(true);
    setError('');
    try {
      const changes = Object.fromEntries(
        fields
          .filter(key => JSON.stringify(draft[key]) !== JSON.stringify(snapshot.config[key]))
          .map(key => [key, draft[key]]),
      );
      const response = await fetch('/__studio/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base: snapshot.version, changes }),
      });
      const body = await response.json();
      if (!response.ok) {
        setConflict(response.status === 409);
        throw new Error(body.error);
      }
      setSnapshot({ ...snapshot, config: draft });
      if (body.restarting) {
        setRestartFrom(body.runtimeId);
        sessionStorage.setItem('studio:settings-saved', body.runtimeId);
        beginSettingsTransition();
      } else {
        await load();
        toast.add({ title: successTitle });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Settings could not save.');
    } finally {
      setSaving(false);
    }
  }

  const discard = () => {
    if (snapshot) setDraft(snapshot.config);
    setError('');
    setConflict(false);
  };
  return {
    snapshot,
    draft,
    error,
    saving,
    restarting,
    conflict,
    dirty,
    blocker,
    editable,
    disabled,
    update,
    save,
    load,
    discard,
  };
}
