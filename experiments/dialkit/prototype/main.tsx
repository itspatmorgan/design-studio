import { useState } from 'react';
import { Link } from '@module/prototypes';
import styles from './_booking.module.css';

// Accepted DialKit refinement. Plain source values remain after removing the controls.
const layout = { titleSize: 48, cardGap: 16, cardRadius: 24, accent: '#b45437', compact: false };
const motion = { duration: 460, distance: 18 };
const finish = { lift: 8 };
const weekends = [
  { date: 'NOV 14–15', name: 'Clay & conversation', detail: 'A quiet studio, a little mess, something made by hand.', location: 'Ojai, California', price: 180, mark: '◒' },
  { date: 'NOV 21–22', name: 'The long table', detail: 'Seasonal cooking and a seat among new friends.', location: 'Hudson, New York', price: 240, mark: '⊙' },
  { date: 'DEC 05–06', name: 'Out of the ordinary', detail: 'A guided walk, a field notebook, a fresh perspective.', location: 'Bend, Oregon', price: 120, mark: '⌁' },
];
export default function Booking() {
  const [selected, setSelected] = useState(0);
  const [confirmation, setConfirmation] = useState(0);
  return (
    <main className={styles.page} style={{ '--booking-accent': layout.accent } as React.CSSProperties}>
      <header className={styles.header}><strong>fieldnotes<span>®</span></strong><Link to='about'>Our approach ↗</Link></header>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>GO A LITTLE OFF SCRIPT</p>
        <h1 style={{ fontSize: layout.titleSize }}>A weekend<br />worth making room for.</h1>
        <p>Step away from the usual. Find a small gathering, learn something new, and take a little of it home.</p>
      </div>
      <div className={styles.sectionTitle}><h2>Find your next good thing</h2><span>Three small escapes</span></div>
      <div className={styles.cards} style={{ gap: layout.cardGap }}>
        {weekends.map((weekend, index) => <button key={weekend.name} className={styles.card} aria-pressed={selected === index} onClick={() => { setSelected(index); setConfirmation(0); }} style={{ boxShadow: finish.lift ? `0 ${finish.lift}px ${finish.lift * 3}px #26312b18` : 'none', borderRadius: layout.cardRadius, padding: layout.compact ? 16 : 24 }}>
          <div className={styles.art} aria-hidden='true'>{weekend.mark}</div>
          <p className={styles.eyebrow}>{weekend.date}</p><h3>{weekend.name}</h3><p>{weekend.detail}</p>
          <div className={styles.cardFooter}><span>{weekend.location}</span><strong>${weekend.price}</strong></div>
        </button>)}
      </div>
      <div className={styles.booking}>
        <div><span className={styles.eyebrow}>YOUR WEEKEND</span><p><strong>{weekends[selected].name}</strong> · One place · ${weekends[selected].price}</p></div>
        <button className={styles.reserve} onClick={() => setConfirmation(value => value + 1)}>Save my place ↗</button>
      </div>
      {confirmation > 0 && <div key={confirmation} role='status' className={styles.confirmation} style={{ animationDuration: `${motion.duration}ms`, '--booking-distance': `${motion.distance}px` } as React.CSSProperties}><strong>You're on the list.</strong><span>This is a demo reservation. Your weekend is waiting.</span><button aria-label='Dismiss confirmation' onClick={() => setConfirmation(0)}>×</button></div>}
      <footer className={styles.footer}>Less scrolling. More stories to tell.<span>A fictional booking prototype</span></footer>
    </main>
  );
}
