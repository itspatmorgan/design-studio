// Adapted from the owner's working personal-site StudioFoundation.astro illustration.
import { useId } from 'react';
import styles from './studio-foundation.module.css';

export function StudioFoundation({ kind }: { kind: 'system' | 'setup' }) {
  const id = useId().replaceAll(':', '');
  return (<div className={`${styles["foundation-art"]} ${styles[`foundation-${kind}`]}`}>
{kind === 'system' && <svg viewBox="0 0 480 430" role="img" aria-label="A design operating system combines theme and components, context and principles, and rules and skills into a foundation for a prototype.">
  <defs><pattern id={`${id}-dots`} width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="currentColor" opacity=".13"/></pattern><pattern id={`${id}-hatch`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V6" stroke="currentColor" opacity=".15"/></pattern></defs>
  <rect x="16" y="16" width="448" height="398" fill={`url(#${id}-dots)`}/>
  <g className={styles['construction']}><path d="M30 30H450M30 400H450M40 20V410M440 20V410M28 30H52M40 18V42M428 400H452M440 388V412"/></g>
  <g className={styles['connector']}><path d="M320 98H356V318H338M320 182H356M320 266H356"/></g>
  <g className={styles['sheet']}><rect x="66" y="46" width="254" height="80" rx="3"/><rect x="66" y="130" width="254" height="80" rx="3"/><rect x="66" y="214" width="254" height="80" rx="3"/></g>
  <g className={styles['mono']}><text x="82" y="68">Theme + components</text><text x="82" y="152">Context + principles</text><text x="82" y="236">Rules + skills</text></g>
  <rect x="82" y="82" width="26" height="26" fill="var(--foreground)"/><rect x="112" y="82" width="26" height="26" fill="var(--illustration-accent)"/><rect x="142" y="82" width="26" height="26" fill={`url(#${id}-hatch)`} stroke="var(--border)"/><rect x="192" y="84" width="52" height="22" rx="4" fill="var(--foreground)"/><path d="M251 86H294M251 94H282M251 102H287" className={styles['ink']}/>
  <path d="M83 168H276M83 178H294M83 188H249" className={styles['ink']}/><path d="m84 252 5 5 9-11m-14 26 5 5 9-11" className={styles['connector']}/><path d="M110 252H274M110 272H243" className={styles['ink']}/>
  <g className={styles['sheet']}><rect x="142" y="312" width="196" height="75" rx="3"/></g><text x="158" y="335" className={styles['label']}>Your prototype</text><path d="M158 347H322" className={styles['construction']}/><rect x="158" y="358" width="36" height="14" fill="var(--illustration-accent)" opacity=".4"/><path d="M203 361H315M203 369H283" className={styles['ink']}/>
  <text x="82" y="319" className={styles['annotation']}>Assigned</text>
</svg>}
{kind === 'setup' && <><svg viewBox="0 0 960 150" role="img" aria-label="Start with the starter kit, make a local copy, and run Design Studio with your coding agent.">
  <defs><pattern id={`${id}-grid`} width="18" height="18" patternUnits="userSpaceOnUse"><path d="M18 0H0V18" stroke="currentColor" fill="none" opacity=".07"/></pattern></defs>
  <rect x="28" y="18" width="904" height="112" fill={`url(#${id}-grid)`}/>
  <path d="M228 73H408M548 73H728" className={styles['connector']} strokeDasharray="3 6"/>
  <g className={styles['sheet']}><path d="M97 32h83v71H97z"/><path d="M90 39h83v71H90z"/><path d="M83 46h83v71H83z"/></g><path d="M96 61H150M96 70H138M96 79H145" className={styles['ink']}/>
  <g className={styles['sheet']}><rect x="436" y="32" width="90" height="66" rx="4"/><path d="M426 106H536L526 98H436z"/></g><path d="m454 54 9 8-9 8M472 71H493" className={styles['connector']}/>
  <g className={styles['sheet']}><rect x="757" y="30" width="112" height="80" rx="4"/></g><path d="M757 47H869M780 47V110" className={styles['construction']}/><rect x="790" y="58" width="27" height="18" fill="var(--illustration-accent)" opacity=".3"/><path d="M826 60H857M826 69H848M791 87H856M791 97H840" className={styles['ink']}/>
  <g className={styles['mono']} textAnchor="middle"><text x="126" y="141">Create your copy</text><text x="480" y="141">Clone locally</text><text x="814" y="141">Run with your agent</text></g>
</svg><div className={styles['mobile-setup-labels']} aria-hidden="true"><span>Create your copy</span><span>Clone locally</span><span>Run with your agent</span></div></>}
</div>);
}
