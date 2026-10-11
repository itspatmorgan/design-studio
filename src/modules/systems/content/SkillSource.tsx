import { useState } from 'react';
import ArtifactSource from '@/platform/app/source/ArtifactSource';
import { openInEditor, repoPath, useFileTree, type FileNode } from '@/platform/app/data/files';
import type { Artifact, Prototype } from '@/platform/app/data/types';
import { Button } from '@/platform/systems/studio/components/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/platform/systems/studio/components/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/platform/systems/studio/components/dialog';
import { skillBundlePaths, skillFolder } from './skillBundle';

const filePaths = (nodes: FileNode[]): string[] =>
  nodes.flatMap(node => (node.dir ? filePaths(node.children ?? []) : [node.path]));

// The file picker exposes the on-disk skill bundle without repeating it in navigation.
export default function SkillSource({ proto, item, onDone }: { proto: Prototype; item: Artifact; onDone: () => void }) {
  const { files } = useFileTree(proto);
  const folder = skillFolder(item.path)!;
  const paths = skillBundlePaths(item.path, files ? filePaths(files) : proto.artifacts.map(artifact => artifact.path));
  const [selected, setSelected] = useState(item.path);
  const path = paths.includes(selected) ? selected : folder + '/SKILL.md';
  const artifact = proto.artifacts.find(artifact => artifact.path === path);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const selectFile = (next: string | null) => {
    if (!next || next === path) return;
    if (dirty) setPending(next);
    else setSelected(next);
  };
  const picker = (
    <Select
      items={paths.map(value => ({ value, label: value.slice(folder.length + 1) }))}
      value={path}
      onValueChange={selectFile}
    >
      <SelectTrigger aria-label='Skill source file' className='w-64 min-w-0'>
        <SelectValue className='truncate' />
      </SelectTrigger>
      <SelectContent>
        {paths.map(file => (
          <SelectItem key={file} value={file}>
            {file.slice(folder.length + 1)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
  const done = (
    <Button size='sm' variant='outline' onClick={onDone}>
      Done
    </Button>
  );

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      {artifact ? (
        <ArtifactSource key={path} proto={proto} item={artifact} label={picker} actions={done} onDirty={setDirty} />
      ) : (
        <>
          <div className='flex h-[57px] shrink-0 items-center gap-3 border-b border-border px-4 text-[12px]'>
            {picker}
            <span className='ml-auto' />
            {done}
          </div>
          <div className='grid flex-1 place-items-center p-8'>
            <div className='max-w-sm text-center'>
              <p className='text-sm text-muted-foreground'>This supporting file cannot be edited as text in Studio.</p>
              <p className='my-3 break-all font-mono text-[12px]'>{repoPath(proto, path)}</p>
              <Button variant='outline' onClick={() => openInEditor(proto, path)}>
                Open in editor
              </Button>
            </div>
          </div>
        </>
      )}
      <Dialog
        open={pending !== null}
        onOpenChange={open => {
          if (!open) setPending(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Discard your changes?</DialogTitle>
            <DialogDescription>
              You have unsaved changes to {path.slice(folder.length + 1)}. They'll be lost if you switch files.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setPending(null)}>
              Keep editing
            </Button>
            <Button
              variant='destructive'
              onClick={() => {
                setSelected(pending!);
                setPending(null);
                setDirty(false);
              }}
            >
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
