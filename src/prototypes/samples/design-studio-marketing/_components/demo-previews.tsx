import { useState } from 'react';
import { Button } from '@/systems/marketing/components/button';
import styles from './landing.module.css';

const feedback = [
  { title: 'Make feedback easier to find', detail: 'Keep incoming ideas in one place.', status: 'Open' },
  { title: 'Show the next step', detail: 'Give every idea a clear owner and next action.', status: 'In review' },
  { title: 'Keep the context nearby', detail: 'Connect decisions to the work that informed them.', status: 'Open' },
];

function InboxPreview() {
  const [selected, setSelected] = useState(0);
  const [resolvedItems, setResolvedItems] = useState<number[]>([]);
  const resolved = resolvedItems.includes(selected);
  const item = feedback[selected];
  return <div className={styles.inboxDemo}>
    <div><h3>Feedback inbox</h3><p className={styles.demoMuted}>A small working interface.</p>
      <div className={styles.feedbackList}>{feedback.map((entry, index) => <button key={entry.title} type="button" aria-pressed={selected === index} className={styles.feedbackRow} onClick={() => setSelected(index)}><span>{entry.title}</span><small>{resolvedItems.includes(index) ? 'Resolved' : entry.status}</small></button>)}</div>
    </div>
    <section className={styles.feedbackDetail} aria-label="Selected feedback">
      <span className={styles.demoBadge}>{resolved ? 'Resolved' : item.status}</span><h4>{item.title}</h4><p>{item.detail}</p>
      <Button variant="outline" onClick={() => setResolvedItems(items => resolved ? items.filter(index => index !== selected) : [...items, selected])}>{resolved ? 'Reopen feedback' : 'Mark resolved'}</Button>
      <p className={styles.demoMuted} role="status">{resolved ? 'Resolved in this demo.' : 'Select an idea and try changing its status.'}</p>
    </section>
  </div>;
}

function DiagramPreview() {
  return <div className={styles.diagramDemo}><h3>From feedback to a decision</h3>
    <svg viewBox="0 0 720 220" role="img" aria-label="Feedback moves to review, then either to a prototype or to more context.">
      <g fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M170 110H254m-8-5 8 5-8 5M414 110h40V55h96m-8-5 8 5-8 5M454 110v55h96m-8-5 8 5-8 5" /></g>
      <g fill="var(--color-bg-primary)" stroke="var(--color-border-primary)"><rect x="10" y="80" width="160" height="60" rx="8"/><rect x="254" y="80" width="160" height="60" rx="8"/><rect x="550" y="25" width="160" height="60" rx="8"/><rect x="550" y="135" width="160" height="60" rx="8"/></g>
      <g fill="currentColor" fontSize="16" textAnchor="middle"><text x="90" y="116">Feedback</text><text x="334" y="116">Review</text><text x="630" y="61">Prototype</text><text x="630" y="171">More context</text></g>
    </svg>
  </div>;
}

function CanvasPreview() {
  return <div className={styles.canvasDemo}><h3>Room to explore</h3><div className={styles.canvasCards}>
    <article className={styles.canvasNote}><small>Question</small><h4>What happens after someone shares an idea?</h4><p>Map the journey before polishing the interface.</p></article>
    <article className={styles.canvasNote}><small>Flow</small><h4>Capture → Review → Try</h4><p>Connect the steps. Make the next action visible.</p></article>
    <article className={styles.canvasNote}><small>Next experiment</small><h4>One inbox, less friction.</h4><p>Build a view and review it together.</p></article>
  </div><p className={styles.demoMuted}>Ideas, notes, and connected explorations on one surface.</p></div>;
}

function DocumentPreview() {
  return <article className={styles.documentDemo}><p className={styles.demoMuted}>Project context</p><h3>A clearer feedback loop</h3><p>Help the team turn incoming feedback into an experiment they can discuss.</p><h4>What we want to learn</h4><ul><li>Can someone find an idea without searching several tools?</li><li>Is the next action clear after review?</li></ul><h4>Our first experiment</h4><p>A shared inbox with a short path from feedback to a working prototype.</p><div className={styles.documentCallout}>Keep the question, the exploration, and the decision together.</div></article>;
}

export function ArtifactPreview({ kind }: { kind: 'view' | 'diagram' | 'canvas' | 'document' }) {
  return <div className={styles.preview}>{kind === 'view' ? <InboxPreview /> : kind === 'diagram' ? <DiagramPreview /> : kind === 'canvas' ? <CanvasPreview /> : <DocumentPreview />}</div>;
}

export function StudioPreview() {
  return <div className={`${styles.preview} ${styles.studioDemo}`}><div><p className={styles.demoMuted}>Your studio</p><h3>A place for your next idea.</h3><p>Keep your prototypes, systems, and context together.</p></div><div className={styles.studioCards}><article><small>Prototype</small><h4>Feedback inbox</h4><p>View · Diagram · Canvas · Document</p></article><article><small>Design system</small><h4>Your components</h4><p>Theme · Components · Context</p></article></div></div>;
}
