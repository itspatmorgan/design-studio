// "New skill" in the system content's Skills tab. A skill has to follow the Agent Skills format
// (https://agentskills.io/specification): a name in lowercase words joined by hyphens, which is
// also its folder's name, and a description that says what it does and when to use it. The
// dialog stays short and shows a rule only when it's broken. Those are checked as you type
// (src/modules/systems/content/skills.ts), and again by the file layer.
import { useState } from 'react';
import { NAME_MAX, descriptionProblem, nameProblem } from '@/modules/systems/content/skills';
import { Button } from '@/systems/studio/components/button';
import { Input } from '@/systems/studio/components/input';
import { Textarea } from '@/systems/studio/components/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/systems/studio/components/dialog';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, description: string) => Promise<void>;
};

export default function NewSkillDialog({ open, onOpenChange, onCreate }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Remounted each time it opens, so it starts empty. */}
        <Form key={String(open)} onCreate={onCreate} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function Form({ onCreate, onCancel }: { onCreate: Props['onCreate']; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Problems show once there's something to be wrong about.
  const nameError = name ? nameProblem(name) : null;
  const descriptionError = description ? descriptionProblem(description) : null;
  const ready = !nameProblem(name) && !descriptionProblem(description);

  async function submit() {
    if (!ready || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onCreate(name, description.trim());
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        submit();
      }}
      className='grid gap-4'
    >
      <DialogHeader>
        <DialogTitle>New skill</DialogTitle>
      </DialogHeader>
      <label className='grid gap-1.5 text-sm font-medium'>
        Name
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
          placeholder='review-design'
          maxLength={NAME_MAX + 8}
          aria-invalid={Boolean(nameError)}
          className='font-mono'
        />
        {nameError && <span className='text-xs font-normal text-destructive'>A skill's name {nameError}</span>}
      </label>
      <label className='grid gap-1.5 text-sm font-medium'>
        Description
        <Textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          placeholder="Reviews a design against the team's principles. Use when someone asks for a critique."
          aria-invalid={Boolean(descriptionError)}
        />
        <span
          className={
            descriptionError ? 'text-xs font-normal text-destructive' : 'text-xs font-normal text-muted-foreground'
          }
        >
          {descriptionError ? `The description ${descriptionError}` : 'What it does, and when to use it.'}
        </span>
      </label>
      {error && (
        <p role='alert' className='text-sm text-destructive'>
          {error}
        </p>
      )}
      <DialogFooter>
        <Button type='button' variant='outline' onClick={onCancel}>
          Cancel
        </Button>
        <Button type='submit' disabled={!ready || saving}>
          {saving ? 'Creating' : 'Create skill'}
        </Button>
      </DialogFooter>
    </form>
  );
}
