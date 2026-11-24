// Echo's homepage, shared by the two directions: `tone` picks a cobalt or a light hero, and `hero`
// carries the values home.tsx tunes with DialKit. Everything below the hero is the same in both.
import type { CSSProperties } from 'react';
import { ArrowRight } from '@/systems/marketing/libraries/icons';
import { buttonVariants } from '@/systems/marketing/components/button';
import { cn } from '#studio/runtime';
import { EchoMark, ProductShot } from './product-shot';
import styles from './site.module.css';

export type HeroTuning = { titleSize: number; shotOverlap: number };

const sources = [
  { name: 'Email', count: 128 },
  { name: 'Chat', count: 94 },
  { name: 'Calls', count: 41 },
  { name: 'Surveys', count: 67 },
];
const roadmap = [
  { title: 'Bulk-assign to a teammate', accounts: 6, mrr: '$38k' },
  { title: 'Import keeps line breaks', accounts: 4, mrr: '$27k' },
  { title: 'Vote on planned items', accounts: 9, mrr: '$21k' },
];
const steps = [
  { n: '01', title: 'Connect your channels', text: 'Forward an inbox, add the Slack app, or paste notes from a call. Echo keeps the customer’s own words.' },
  { n: '02', title: 'Match feedback to accounts', text: 'Every request is linked to the company behind it, with its plan and revenue from your CRM.' },
  { n: '03', title: 'Decide and close the loop', text: 'Rank requests by reach and revenue, plan the work, and tell every customer when it ships.' },
];

function Header({ onBrand }: { onBrand: boolean }) {
  return (
    <header className={styles.header}>
      <a href="#top" className={styles.brand}><EchoMark className={styles.brandMark} />Echo</a>
      <nav className={styles.nav}>
        <a href="#product">Product</a>
        <a href="#how">How it works</a>
        <a href="#start">Pricing</a>
      </nav>
      <div className={styles.headerActions}>
        <a href="#start" className={cn(styles.signIn)}>Sign in</a>
        <a href="#start" className={cn(buttonVariants({ size: 'sm' }), onBrand && styles.buttonOnBrand)}>Start free</a>
      </div>
    </header>
  );
}

export function EchoHome({ tone, hero }: { tone: 'cobalt' | 'light'; hero?: HeroTuning }) {
  const onBrand = tone === 'cobalt';
  const vars = hero && ({ '--hero-title': `${hero.titleSize}px`, '--shot-overlap': `${hero.shotOverlap}px` } as CSSProperties);
  return (
    <div id="top" className={styles.page} style={vars}>
      <section className={cn(styles.hero, onBrand ? styles.heroCobalt : styles.heroLight)}>
        <Header onBrand={onBrand} />
        <div className={styles.heroCopy}>
          <h1 className={styles.heroTitle}>Hear every customer.{!onBrand && <><br /><span className={styles.accent}>Build what matters.</span></>}</h1>
          <p className={styles.heroLede}>Echo brings feedback from email, chat, calls, and surveys into one inbox, tied to the accounts behind it, so your team builds what matters next.</p>
          <div className={styles.heroActions}>
            <a href="#start" className={cn(buttonVariants({ size: 'lg' }), onBrand && styles.buttonOnBrand)}>Start free <ArrowRight /></a>
            <a href="#how" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), onBrand && styles.outlineOnBrand)}>See how it works</a>
          </div>
        </div>
        <div className={styles.shotWrap}><ProductShot /></div>
      </section>

      <section id="product" className={styles.section}>
        <h2 className={styles.sectionTitle}>Every channel, every account, one place to decide.</h2>
        <div className={styles.features}>
          <article className={styles.feature}>
            <div className={styles.vignette}>
              {sources.map((s) => (
                <div key={s.name} className={styles.sourceRow}><span>{s.name}</span><span className={styles.sourceBar}><i style={{ width: `${(s.count / 128) * 100}%` }} /></span><span className={styles.mono}>{s.count}</span></div>
              ))}
            </div>
            <h3>Capture it where it’s said</h3>
            <p>Support threads, sales calls, and surveys land in one inbox, in the customer’s own words.</p>
          </article>
          <article className={styles.feature}>
            <div className={styles.vignette}>
              <div className={styles.account}>
                <span className={styles.accountLogo}>A</span>
                <div><b>Arcadia Bank</b><small>Enterprise · 240 seats</small></div>
                <span className={styles.mono}>$18.9k/mo</span>
              </div>
              <div className={styles.accountAsk}><em className={styles.high}>High</em>Slack alerts for high-value accounts</div>
              <div className={styles.accountAsk}><em className={styles.tagBrand}>Planned</em>Import keeps line breaks</div>
            </div>
            <h3>Know who is asking</h3>
            <p>Each request carries its account, plan, and revenue, so the loudest voice isn’t the only one heard.</p>
          </article>
          <article className={styles.feature}>
            <div className={styles.vignette}>
              {roadmap.map((r) => (
                <div key={r.title} className={styles.roadmapRow}><span className={styles.roadmapDot} /><span className={styles.roadmapTitle}>{r.title}</span><span className={styles.muted}>{r.accounts} accounts</span><span className={styles.mono}>{r.mrr}</span></div>
              ))}
            </div>
            <h3>Plan with the full picture</h3>
            <p>Rank what to build by reach and revenue, then tell every customer when it ships.</p>
          </article>
        </div>
      </section>

      <section id="how" className={cn(styles.section, styles.sectionTinted)}>
        <h2 className={styles.sectionTitle}>Up and running in an afternoon.</h2>
        <ol className={styles.steps}>
          {steps.map((s) => (
            <li key={s.n}><span className={styles.stepNumber}>{s.n}</span><h3>{s.title}</h3><p>{s.text}</p></li>
          ))}
        </ol>
      </section>

      <section id="start" className={styles.closing}>
        <h2>Build what your customers are asking for.</h2>
        <p>Free for teams of up to five. No credit card.</p>
        <a href="#top" className={cn(buttonVariants({ size: 'lg' }), styles.buttonOnBrand)}>Start free <ArrowRight /></a>
      </section>

      <footer className={styles.footer}>
        <span className={styles.brand}><EchoMark className={styles.brandMark} />Echo</span>
        <span className={styles.muted}>Echo is a fictional product, made for Design Studio’s examples.</span>
      </footer>
    </div>
  );
}
