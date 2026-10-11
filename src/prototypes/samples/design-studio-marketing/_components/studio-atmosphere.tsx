// Adapted from the owner's working personal-site StudioAtmosphere.astro illustration.
import { useId } from 'react';
import styles from './studio-atmosphere.module.css';

export function StudioAtmosphere() {
  const id = useId().replaceAll(':', '');
  return (<div className={styles['studio-atmosphere']}>
  <div className={styles['atmosphere-art']} role="img" aria-label="A shared drafting table: you and a coding agent work on source files that become a view, diagram, document, and canvas.">
    <svg viewBox="0 0 560 480" fill="none" aria-hidden="true">
      <defs>
        <pattern id={`${id}-grid`} width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" stroke="currentColor" strokeOpacity="0.07" strokeWidth="0.6" /></pattern>
        <pattern id={`${id}-hatch`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V7" stroke="currentColor" strokeOpacity="0.13" strokeWidth="1" /></pattern>
      </defs>
      <rect x="16" y="16" width="528" height="430" fill={`url(#${id}-grid)`} />
      <g stroke="currentColor" opacity="0.24" strokeWidth="0.7">
        <path d="M16 32H544M32 16V446M528 16V446M16 430H544" />
        <path d="M20 32H44M32 20V44M516 32H540M528 20V44M20 430H44M32 418V442M516 430H540M528 418V442" />
      </g>
      <path d="M450 365H544V446H450Z" fill={`url(#${id}-hatch)`} />
      <g transform="translate(0 34)">
      <g className={styles['parallax-near']}>
        <g stroke="var(--illustration-accent)" strokeWidth="1.2">
          <path d="M260 114H280V295H302M280 130H302M280 284H260" opacity="0.55" />
          <path className={styles['draft-trace']} d="M260 114H280V295H302M280 130H302M280 284H260" opacity="0.7" />
        </g>
        <g transform="rotate(-3 154 106)">
          <rect x="42" y="40" width="222" height="138" rx="3" fill="var(--card)" stroke="currentColor" strokeOpacity="0.3" />
          <path d="M42 67H264" stroke="currentColor" opacity="0.15" />
          <text x="54" y="58" className={styles['file-label']}>view.tsx</text>
          <text x="56" y="89" className={styles['artifact-title']}>Prototype</text>
          <rect x="220" y="79" width="30" height="11" rx="2" fill="var(--illustration-accent)" opacity="0.35" />
          <path d="M56 105H250M56 122H250M56 139H250M56 156H250" stroke="currentColor" opacity="0.12" />
          <path d="M60 114H130M60 131H153M60 148H118" stroke="currentColor" strokeWidth="2" opacity="0.4" />
          <path d="M196 114H212M196 131H212M196 148H212" stroke="var(--illustration-accent)" strokeWidth="4" opacity="0.45" />
        </g>
        <g transform="rotate(3 409 136)">
          <rect x="298" y="68" width="222" height="136" rx="3" fill="var(--card)" stroke="currentColor" strokeOpacity="0.3" />
          <text x="310" y="86" className={styles['file-label']}>flow.mermaid</text>
          <path d="M298 95H520" stroke="currentColor" opacity="0.15" />
          <g stroke="currentColor" strokeWidth="0.9" opacity="0.65">
            <rect x="312" y="128" width="49" height="24" /><path d="M374 140L397 117L420 140L397 163Z" /><rect x="450" y="108" width="54" height="24" /><rect x="450" y="158" width="54" height="24" />
            <path d="M361 140H374M420 140L450 120M420 140L450 170" />
          </g>
          <text x="320" y="143" className={styles['tiny-label']}>Capture</text><text x="384" y="143" className={styles['tiny-label']}>Review</text><text x="462" y="123" className={styles['tiny-label']}>Act</text><text x="460" y="173" className={styles['tiny-label']}>Later</text>
        </g>
        <g transform="rotate(2 170 283)">
          <rect x="74" y="206" width="190" height="150" rx="3" fill="var(--card)" stroke="currentColor" strokeOpacity="0.3" />
          <text x="88" y="225" className={styles['file-label']}>context.md</text>
          <path d="M74 235H264" stroke="currentColor" opacity="0.15" />
          <text x="90" y="256" className={styles['artifact-title']}># Project context</text>
          <text x="90" y="279" className={styles['tiny-label']}>The problem</text>
          <path d="M90 290H246M90 299H234M90 308H242" stroke="currentColor" opacity="0.3" />
          <text x="90" y="331" className={styles['tiny-label']}>What we're exploring</text>
          <path d="M90 341H228" stroke="currentColor" opacity="0.3" />
        </g>
        <g transform="rotate(-2 408 291)">
          <rect x="298" y="226" width="222" height="132" rx="3" fill="var(--card)" stroke="currentColor" strokeOpacity="0.3" />
          <text x="310" y="245" className={styles['file-label']}>board.excalidraw</text>
          <path d="M298 254H520" stroke="currentColor" opacity="0.15" />
          <rect x="315" y="272" width="72" height="48" fill={`url(#${id}-hatch)`} stroke="currentColor" strokeOpacity="0.35" />
          <path d="M325 284H376M325 292H366M325 300H372" stroke="currentColor" opacity="0.35" />
          <path d="M404 282L430 269L447 288L425 306ZM447 288L478 290M466 280L496 282L493 312L464 310Z" stroke="currentColor" opacity="0.65" />
          <path d="M330 335Q368 317 395 335T492 330" stroke="var(--illustration-accent)" strokeWidth="1.5" opacity="0.75" />
        </g>
      </g>
      <g className={styles['parallax-front']}>
        <g className={styles['human-cursor']} transform="translate(213 143)">
          <path d="M0 0V18L5 13L10 21L14 19L9 11H17Z" fill="currentColor" stroke="var(--background)" strokeWidth="1.5" />
          <rect x="14" y="19" width="44" height="23" rx="3" fill="var(--foreground)" /><text x="22" y="35" className={styles['cursor-label']} fill="var(--background)">You</text>
        </g>
        <g transform="translate(218 296)">
          <g className={styles['agent-cursor']}>
            <path d="M0 0V18L5 13L10 21L14 19L9 11H17Z" fill="var(--illustration-accent)" stroke="var(--background)" strokeWidth="1.5" />
            <rect x="14" y="19" width="58" height="23" rx="3" fill="var(--illustration-accent)" /><text x="22" y="32" className={styles['cursor-label']} fill="var(--background)">Agent</text>
          </g>
        </g>
      </g>
      </g>
    </svg>
  </div>
</div>);
}
