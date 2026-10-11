import { useState } from 'react';
import { Copy, Info } from 'lucide-react';
import { Button } from '@/systems/studio/components/button';
import { Alert, AlertTitle, AlertDescription } from '@/systems/studio/components/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/systems/studio/components/dialog';
import NewSystemButton from './NewSystemDialog';

export default function SystemStarterNotice({ system, label, canCustomize }: {
  system: string; label: string; canCustomize: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const prompt = `Help me customize “${label}” using its existing foundation. Ask what I want to change or add, then show me the result in Studio. Clear the example banner when the customization is complete.\n\nUse the setup-design-system skill for system “${system}”. Preserve existing prototypes as you adapt the system.`;
  async function copy() {
    try { await navigator.clipboard.writeText(prompt); setCopied(true); setError(''); }
    catch { setError('Could not copy. Select the prompt and paste it into your agent’s chat.'); }
  }
  return <div className="mb-6">
    <Alert variant="info" role="note" aria-labelledby="system-example">
      <Info aria-hidden="true" />
      <AlertTitle id="system-example">{label} is an example system</AlertTitle>
      <AlertDescription>Use it to explore Studio. Start a new system for your own work, or adapt this example.</AlertDescription>
    </Alert>
    {canCustomize && <div className="mt-3 flex flex-wrap gap-3">
      <NewSystemButton label="Start a new system" />
      <Dialog open={open} onOpenChange={value => { setOpen(value); if (value) { setCopied(false); setError(''); } }}>
        <DialogTrigger render={<Button variant="outline" />}>Customize this example</DialogTrigger>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Customize {label}</DialogTitle>
            <DialogDescription>Copy this prompt into your agent’s chat and send.</DialogDescription>
          </DialogHeader>
          <p className="max-h-[50vh] select-text overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-4 text-sm leading-6">{prompt}</p>
          {(error || copied) && <p role="status" className="text-xs text-muted-foreground">{error || 'Paste into your agent’s chat and send to continue.'}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            <Button onClick={() => void copy()}><Copy className="size-4" aria-hidden />{copied ? 'Prompt copied' : 'Copy prompt'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>}
  </div>;
}
