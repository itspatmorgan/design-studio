import { Link } from '@module/prototypes';
import styles from './_booking.module.css';
const values = { readingSize: 22, lineHeight: 1.6 };
export default function About() {
  return <main className={styles.page}><header className={styles.header}><strong>fieldnotes®</strong><Link to='main'>← Find a weekend</Link></header><div className={styles.hero}><p className={styles.eyebrow}>OUR APPROACH</p><h1>Make something.<br />Meet someone.</h1><p style={{ fontSize: values.readingSize, lineHeight: values.lineHeight }}>We bring small groups together around things worth slowing down for. Good food, useful skills, and a little room for the unexpected.</p><p>Every gathering is hosted by someone who loves what they do. Bring your curiosity. Leave with a story.</p></div></main>;
}
