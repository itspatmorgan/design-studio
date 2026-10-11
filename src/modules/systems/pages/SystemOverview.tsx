import { useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight } from 'lucide-react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Archive02Icon } from '@hugeicons/core-free-icons';
import { Alert, AlertTitle, AlertDescription } from '@/systems/studio/components/alert';
import { useManifest } from '@/platform/app/data/useManifest';
import { systemUsage, prototypeLink } from '@/platform/app/data/manifest';
import { contentId } from '@/platform/core/roots';
import { ThemeScope } from '../ThemeScope';
import { SYSTEM_SPECS, PLATFORM_ID } from '../data/systems';
import { systemAssets } from '../data/assets';
import SystemReferenceNotice from './SystemReferenceNotice';
import SystemSetup from './SystemSetup';
import SystemStarterNotice from './SystemStarterNotice';
import { finishSystemCreation } from './creationTransition';
import { isSkillFile } from '../content/rules';
import type { DesignSystem } from '@/platform/app/data/types';
import type { SystemComponentDoc } from '../docs';
import type { ThemeToken } from '../themeTokens';
import { ColorModeSupport, PageHeader } from './foundations';

export default function SystemOverview({ system, sys, components, tokens }: {
  system: string; sys: DesignSystem; components: SystemComponentDoc[]; tokens: ThemeToken[];
}) {
  const manifest = useManifest();
  useEffect(() => { if (import.meta.env.DEV && manifest.systems[system]) finishSystemCreation(SYSTEM_SPECS[system]?.studioId); }, [system, manifest]);
  const platform = system === PLATFORM_ID;
  const spec = SYSTEM_SPECS[system];
  const guidance = [
    { id: 'context', label: 'Context documents' },
    { id: 'skills', label: 'Skills' },
  ].map(section => {
    const proto = manifest.systemContent.find(proto => proto.id === contentId(system, section.id));
    const artifacts = proto?.artifacts.filter(artifact => section.id !== 'skills' || isSkillFile('skills', artifact.path)) ?? [];
    return { ...section, proto, artifacts };
  });
  const usage = systemUsage(manifest.prototypes, system);
  const sectionHeading = 'mb-4 text-lg font-semibold tracking-tight';
  const guidanceCount = guidance.reduce((count, section) => count + section.artifacts.length, 0);
  const blank = !platform && !components.length && !tokens.length && !guidanceCount && !systemAssets(system).length && !sys.icons;

  if (blank && spec.status === 'active' && import.meta.env.DEV) return <>
    <PageHeader title={sys.label} description="This system is empty. Choose how you want to build it." />
    <SystemReferenceNotice system={system} />
    <SystemSetup key={system} system={system} label={sys.label} />
  </>;

  return <>
    <PageHeader title={sys.label} description={sys.summary ?? `The guidance and code included in ${sys.label}.`} />
    <SystemReferenceNotice system={system} />
    {spec.status === 'archived' && <Alert variant="info" role="note" className="mb-6 p-4">
      <HugeiconsIcon icon={Archive02Icon} />
      <AlertTitle>This system is archived</AlertTitle>
      <AlertDescription>Files are kept locally and excluded from deployment. Choose Restore from the system menu to use it again.</AlertDescription>
    </Alert>}
    {platform && <p className="mb-6 text-[13px] text-muted-foreground">Required application system</p>}
    {sys.overview?.starter && <SystemStarterNotice label={sys.label} />}
    {!platform && spec.status === 'active' && import.meta.env.DEV && !sys.overview?.curation && !sys.overview?.starter && <details className="mb-6"><summary className="cursor-pointer text-sm font-medium">Curate or bring in a system</summary><div className="mt-4"><SystemSetup system={system} label={sys.label} /></div></details>}

    <div className="mb-4 grid gap-4">
      <section className="min-w-0 rounded-xl border border-border/50 bg-muted/40 p-6" aria-labelledby="system-guidance">
        <h2 id="system-guidance" className={sectionHeading}>Instructions</h2>
        <Metrics items={guidance.map(section => ({ label: section.label, count: section.artifacts.length }))} />
        {sys.overview?.guidance ? <p className="text-sm leading-6 text-foreground/80">{sys.overview.guidance}</p> : !guidanceCount && <p className="text-sm leading-6 text-foreground/80">No system instructions have been added yet.</p>}
      </section>
      <section className="min-w-0 rounded-xl border border-border/50 bg-muted/40 p-6" aria-labelledby="system-code">
        <h2 id="system-code" className={sectionHeading}>Toolkit</h2>
        <Metrics items={[{ label: 'Components', count: components.length }, { label: 'Theme tokens', count: new Set(tokens.map(token => token.name)).size }, { label: 'Local assets', count: systemAssets(system).length }]} />
        {sys.overview?.code && <p className="text-sm leading-6 text-foreground/80">{sys.overview.code}</p>}
        <div className="mt-4 text-xs text-muted-foreground"><ColorModeSupport modes={spec.colorModes} /></div>
      </section>
    </div>

    <section className="rounded-xl border border-border/50 bg-muted/40 p-6" aria-labelledby="system-usage">
      <div className="min-w-0">
        <h2 id="system-usage" className={sectionHeading}>Where it’s used</h2>
        {!platform && <Metrics items={[{ label: 'Active prototypes', count: usage.count }]} />}
      </div>
      <div className="min-w-0">
        {platform ? <p className="text-sm leading-6 text-foreground/80">Studio’s navigation, menus, editors, and documentation use this system. It is maintained with platform releases and is unavailable as a prototype system.</p> : usage.count ? <>
          <ul className="space-y-1">{usage.recent.map(proto => <li key={proto.contributorKey + '/' + proto.id}><Link {...prototypeLink(proto)} className="flex items-center gap-3 rounded-lg border border-border bg-transparent px-4 py-3 text-sm hover:bg-muted"><span className="min-w-0 flex-1 truncate">{proto.title}</span><span className="max-w-36 truncate text-[12px] text-muted-foreground">{proto.contributor}</span><ArrowUpRight aria-hidden className="size-3.5 shrink-0" /></Link></li>)}</ul>
          <Link to={'/prototypes' as never} search={{ system } as never} className="mt-3 inline-flex items-center gap-1 text-sm hover:underline">View prototypes using this system<ArrowUpRight aria-hidden className="size-3.5" /></Link>
        </> : <p className="text-sm leading-6 text-foreground/80">No active prototypes use this system yet. Choose {sys.label} when creating a prototype.</p>}
      </div>
    </section>

    {sys.intro && <ThemeScope themeClass={sys.scopeClass} className="mt-10 text-foreground">{sys.intro}</ThemeScope>}
  </>;
}

function Metrics({ items }: { items: { label: string; count: number }[] }) {
  return <dl className="mb-5 grid grid-cols-3 gap-4">
    {items.map(item => <div key={item.label} className="flex flex-col gap-1">
      <dt className="order-2 text-xs text-muted-foreground">{item.label}</dt>
      <dd className="text-3xl font-semibold tracking-tight tabular-nums">{item.count}</dd>
    </div>)}
  </dl>;
}
