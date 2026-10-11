import type { ReactNode } from 'react';
import { ArrowUpRight } from '@/systems/marketing/libraries/icons';
import { buttonVariants } from '@/systems/marketing/components/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/systems/marketing/components/tabs';
import { ArtifactPreview, StudioPreview } from './demo-previews';
import { StudioAtmosphere } from './studio-atmosphere';
import { StudioFoundation } from './studio-foundation';
import { StudioOwnership } from './studio-ownership';
import { WebsiteArtifactPreview } from './website-artifacts';
import agentMarkdown from './agent';
import styles from './landing.module.css';

const repository = 'https://github.com/itspatmorgan/design-studio-starter';
const examples = [
  { id: 'view', label: 'View', text: 'Build a working interface with your own components.' },
  { id: 'diagram', label: 'Diagram', text: 'Make the system and its flows easier to understand.' },
  { id: 'canvas', label: 'Canvas', text: 'Explore ideas and arrange references on an open canvas.' },
  { id: 'document', label: 'Document', text: 'Keep the reasoning and references alongside the work.' },
] as const;
function StudioMark({ small = false }: { small?: boolean }) {
  return <svg viewBox="0 0 40 32" className={small ? styles.smallMark : "h-8 w-10"} aria-hidden="true" fill="currentColor"><path d="M0 0h11v32H0zM15 0h3a16 16 0 0 1 0 32h-3z" /></svg>;
}
function ResourceLink({ href, children }: { href: string; children: ReactNode }) {
  const external = href.startsWith('https://');
  return <a href={href} className={buttonVariants({ variant: "link", size: "sm" })} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>{children}<ArrowUpRight /></a>;
}
export function LandingPage({ version }: { version: 1 | 2 | 3 }) {
  const headlines = { 1: <>Your next idea.<br />Make it real.</>, 2: <>A studio for<br />what comes next.</>, 3: <>Design with intent.<br />Build with an agent.</> };
  const content = <>
        <main>
          <section className={`${styles.hero} ${styles['hero' + version]}`}>
            <div className={styles.heroCopy}>
            <h1 className="text-display-md font-medium tracking-tight md:text-display-lg">{headlines[version]}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-text-tertiary">{version === 3 ? "An open platform for designers and product managers who build. Turn ideas into working prototypes with an agent that understands your components, context, and design principles." : "An open-source prototype sandbox for designers and builders. Work with your coding agent, your components, and your context."}</p>
            <div className="mt-6"><a href="#install" className={buttonVariants({ size: "lg" })}>Get started</a></div>
            </div>
            {version === 2 && <StudioFoundation kind="system" />}
            {version === 3 && <StudioAtmosphere />}
          </section>
          <section className="py-8 md:py-12" aria-labelledby="demo-title">
            <h2 id="demo-title" className="text-display-sm font-medium tracking-tight">{version === 1 ? 'From an idea to a working prototype.' : version === 2 ? 'Give the idea room to move.' : 'Build prototypes that connect the whole idea'}</h2>
            <Tabs className={version === 3 ? styles.websiteGallery : "mt-6"} defaultValue={version === 2 ? 'canvas' : 'view'}>
              <TabsList variant="line" aria-label="Artifact examples" className={version === 3 ? styles.galleryList : undefined}>{examples.map(item => <TabsTrigger key={item.id} value={item.id}>{version === 3 ? {view: 'Interface', diagram: 'Triage flow', canvas: 'Explorations', document: 'Context'}[item.id] : item.label}</TabsTrigger>)}</TabsList>
              {examples.map(item => <TabsContent key={item.id} value={item.id} className={version === 3 ? styles.galleryPanel : "pt-5"}>
                <figure>{version === 1 ? <ArtifactPreview kind={item.id} /> : <WebsiteArtifactPreview kind={item.id} />}<figcaption className="mt-4 text-md text-text-secondary">{item.text}</figcaption></figure>
              </TabsContent>)}
            </Tabs>
            <p className="mt-3 text-sm text-text-tertiary">{version === 1 ? "Self-contained examples rendered in code. Try selecting and resolving feedback in the inbox." : "Try filtering and triaging feedback. The diagram, canvas, and context tell the same story."}</p>
          </section>
          {version > 1 && <section className={styles.systemSection} aria-labelledby="design-system-title">
            <div><h2 id="design-system-title" className="text-display-sm font-medium tracking-tight">Give your agent a design <em>operating</em> system</h2><p>Go beyond themes and components. Give your agent the context, rules, and skills to build prototypes that hit the mark.</p>
              <div className={styles.systemLayers}>{[
                ['Theme and components.', 'Define the visual language and reusable building blocks your prototypes should use.'],
                ['Context and principles.', 'Give your agent the product knowledge and design guidance behind those choices.'],
                ['Rules and skills.', 'Capture how your team works with instructions and repeatable workflows.'],
              ].map(([title, body]) => <div key={title}><h3>{title}</h3><p>{body}</p></div>)}</div>
            </div><StudioFoundation kind="system" />
          </section>}
          {version === 3 && <section className="py-12" aria-labelledby="foundation-title"><h2 id="foundation-title" className="text-display-sm font-medium tracking-tight">A thoughtful foundation to make your own</h2><p className="mt-4 text-text-tertiary">Start with tools and defaults chosen to work well together. Make them your own—with your agent, your code, and the way your team works.</p><div className={styles.ownershipGrid}>{[
            ['A considered starting point.', 'Views, diagrams, canvases, and documents are ready to work together, so you can start with your ideas.'],
            ['Fits the way you work.', 'Work in your preferred coding agent. Bring your components and context into Design Studio, and shape it around your team.'],
            ['Room to make it yours.', 'Open-source tools and open file formats give you a foundation you can change and extend as your needs evolve.'],
          ].map(([title, body], index) => <article key={title}><StudioOwnership kind={index} /><h3>{title}</h3><p>{body}</p></article>)}</div></section>}
          <section id="install" className="py-16 md:py-20">
            <h2 className="text-display-sm font-medium tracking-tight">Run your own studio.</h2>
            {version > 1 && <StudioFoundation kind="setup" />}
            <ol className={styles.steps}>
              <li><h3 className="text-lg font-semibold">Create your repository.</h3>
                <p>On GitHub, choose “Use this template” → “Create a new repository”. Select your account or organization, give your studio a repository name, and choose its visibility.</p>
                <ResourceLink href={repository}>Use the template</ResourceLink>
              </li>
              <li><h3 className="text-lg font-semibold">Bring it onto your computer.</h3>
                <p>In your new repository, open “Code” and copy the HTTPS clone URL. Run these commands in your terminal, using that URL and the repository name you chose.</p>
                <pre className={styles.code}><code>{`git clone https://github.com/YOUR-ACCOUNT/YOUR-STUDIO.git\ncd YOUR-STUDIO`}</code></pre>
              </li>
              <li><h3 className="text-lg font-semibold">Install and start Studio.</h3>
                <p>Install mise if needed, then run these commands from your repository folder.</p>
                <ResourceLink href="https://mise.jdx.dev/installing-mise.html">Install mise</ResourceLink>
                <pre className={styles.code}><code>{`mise install\nmise exec -- pnpm install\nmise exec -- pnpm dev`}</code></pre>
                <p><code>mise install</code> installs the Node.js and pnpm versions this project uses. <code>pnpm install</code> installs its dependencies. <code>pnpm dev</code> starts the local development server.</p>
                <p>The <code>mise exec --</code> prefix runs pnpm with the project's tool versions. If mise is already activated in your shell, you can use <code>pnpm install</code> and <code>pnpm dev</code> directly.</p>
                <p>Open the local URL printed in your terminal. Keep the server running while you use Studio.</p>
              </li>
            </ol>
          </section>
          <section className="pb-16 md:pb-20">
            <h2 className="text-display-sm font-medium tracking-tight">Make it yours.</h2>
            <p className="mt-5 max-w-2xl text-md leading-relaxed text-text-tertiary">Open your repository folder in the editor or coding agent you already use, and run Studio alongside it. Ask your agent to configure your studio, bring your design system, or start a prototype. Review the results in your browser.</p>
            <div className="mt-4"><ResourceLink href="https://github.com/itspatmorgan/design-studio-plugin/blob/main/SETUP.md">Read the setup instructions</ResourceLink></div>
            {version !== 3 && <figure className="mt-6">{version === 1 ? <StudioPreview /> : <StudioOwnership kind={1} />}<figcaption className="mt-3 text-sm text-text-tertiary">An example of how your prototypes and design system come together.</figcaption></figure>}
          </section>
        </main>
        {version !== 3 && <footer className="pb-12"><p className="text-sm leading-relaxed text-text-tertiary">This marketing demo uses its own Marketing system: Geist, warm neutrals, and shadcn/ui.</p><div className="mt-4 flex flex-wrap gap-6"><ResourceLink href="/systems/v4576ka1mbpbqdp1">Marketing system</ResourceLink><ResourceLink href={repository}>GitHub</ResourceLink></div></footer>}
  </>;
  const brand = <a href="#" className="flex items-center gap-3 text-lg font-semibold"><StudioMark small={version === 3} />Design Studio</a>;
  return <div className={`min-h-full bg-bg-primary font-sans text-text-primary ${version > 1 ? styles.websiteArt : ""}`}>
    {version === 3 ? <Tabs defaultValue="human" className={styles.siteWidth}>
      <header className="flex flex-wrap items-center justify-between gap-6 py-8">{brand}<TabsList aria-label="Reading mode" className={styles.modeList}><TabsTrigger value="human" className={styles.modeTab}>Human</TabsTrigger><TabsTrigger value="agent" className={styles.modeTab}>Agent</TabsTrigger></TabsList></header>
      <TabsContent value="human">{content}</TabsContent>
      <TabsContent value="agent"><main className="pt-8 pb-16"><pre className={styles.markdown}>{agentMarkdown}</pre></main></TabsContent>
    </Tabs> : <div className="mx-auto max-w-4xl px-6"><header className="py-8">{brand}</header>{content}</div>}
  </div>;
}
