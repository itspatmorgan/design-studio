/** @studio-id d87cbzqxprc8ct2k */
import { useEffect, useState } from 'react';
import styles from './_components/hero-motion.module.css';

// A hero that moves: the copy rises in, and an agent run loops through its steps. On a canvas this
// view holds still once loaded; select it there to watch it play.
const steps = [
  'Reading the project brief',
  'Choosing components from the Marketing system',
  'Building the landing page',
  'Checking it in light and dark',
  'Ready for review',
];

export default function HeroMotion() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setStep(current => (current + 1) % steps.length), 1400);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className='min-h-full bg-bg-primary font-sans text-text-primary'>
      <section className={styles.hero}>
        <div className={styles.copy}>
          <h1 className='text-display-md font-medium tracking-tight md:text-display-lg'>Watch the idea take shape.</h1>
          <p className='mt-6 max-w-xl text-lg leading-relaxed text-text-tertiary'>
            Describe what you want to try. Your agent builds it with your components, and you review the working
            screen.
          </p>
        </div>
        <div className={styles.run} aria-label='Agent run' role='status'>
          <div className={styles.runHeader}>
            <span className={styles.pulse} aria-hidden />
            Agent at work
          </div>
          <ol className={styles.steps}>
            {steps.map((label, index) => (
              <li key={label} data-state={index < step ? 'done' : index === step ? 'active' : 'waiting'}>
                {label}
              </li>
            ))}
          </ol>
          <div className={styles.track}>
            <div className={styles.bar} style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
          </div>
        </div>
      </section>
    </div>
  );
}
