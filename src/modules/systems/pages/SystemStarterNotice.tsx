import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Copy } from 'lucide-react';
import { Button, buttonVariants } from '@/systems/studio/components/button';

export default function SystemStarterNotice({ system, label, canCustomize }: {
  system: string; label: string; canCustomize: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const prompt = `Help me customize “${label}” using its existing foundation. Ask what I want to change or add, then show me the result in Studio.\n\nUse the setup-design-system skill for system “${system}”. Preserve existing prototypes as you adapt the system.`;
  async function copy() {
    try { await navigator.clipboard.writeText(prompt); setCopied(true); setError(''); }
    catch { setError('Could not copy. Select the prompt and paste it into your agent’s chat.'); }
  }
  return <aside className="mb-6 rounded-xl border border-info-border bg-info p-6 text-info-foreground" aria-labelledby="system-example">
    <h2 id="system-example" className="mb-2 text-lg font-semibold tracking-tight">Make this example system your own</h2>
    <p className="text-sm leading-6 text-info-foreground/90">Customize {label}’s theme, components, and guidance. Or start with a new system and delete this example from its menu.</p>
    {canCustomize && <>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button onClick={() => setOpen(previous => !previous)} aria-expanded={open} aria-controls="system-customization-prompt">Customize this system</Button>
        <Link to={'/systems' as never} className={buttonVariants({ variant: 'outline' })}>Start with a new system</Link>
      </div>
      {open && <div id="system-customization-prompt" className="mt-5">
        <p className="mb-3 text-sm text-info-foreground/90">Copy this prompt into your agent’s chat and send.</p>
        <p className="select-text whitespace-pre-wrap rounded-lg border border-border bg-background p-4 text-sm leading-6 text-foreground">{prompt}</p>
        <Button className="mt-4" onClick={() => void copy()}><Copy className="size-4" aria-hidden />{copied ? 'Prompt copied' : 'Copy prompt'}</Button>
        <p role="status" className="mt-2 text-xs text-info-foreground/90">{error || (copied ? 'Paste into your agent’s chat and send to continue.' : '')}</p>
      </div>}
    </>}
  </aside>;
}
