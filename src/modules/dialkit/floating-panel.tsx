import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode, type RefObject } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { SlidersHorizontalIcon, Cancel01Icon, Refresh01Icon } from '@hugeicons/core-free-icons';
import styles from './inspector.module.css';

const ease = [0.16, 1, 0.3, 1] as const;
type Point = { x: number; y: number };
export function FloatingDialKit({ save, canSave, saving, count, reset, frame, children, initialOpen = false, openRequest = 0 }: {
  save?:()=>Promise<boolean>; canSave?:boolean; saving?:boolean;
  openRequest?: number; initialOpen?: boolean; count: number; reset: () => void;
  frame: RefObject<HTMLIFrameElement | null>; children: ReactNode;
}) {
  const [open, setOpen] = useState(initialOpen);
  useEffect(() => { if (openRequest) setOpen(true); }, [openRequest]);
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [resetCount, setResetCount] = useState(0);
  const reduced = useReducedMotion();
  const surface = useRef<HTMLDivElement>(null);
  const anchor = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const chip = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ id: number; start: Point; origin: Point } | null>(null);
  const id = useId();
  const clamp = (point: Point): Point => {
    const area = surface.current;
    const shell = anchor.current;
    const content = panel.current;
    if (!area || !shell || !content) return point;
    return {
      x: Math.max(Math.min(0, point.x), Math.min(0, shell.offsetWidth + 24 - area.clientWidth)),
      y: Math.max(0, Math.min(point.y, Math.max(0, area.clientHeight - content.offsetHeight - 68))),
    };
  };
  const close = () => {
    setOpen(false);
    chip.current?.focus({ preventScroll: true });
  };
  useLayoutEffect(() => {
    const observer = new ResizeObserver(() => setPosition(previous => {
      const next = clamp(previous);
      return next.x === previous.x && next.y === previous.y ? previous : next;
    }));
    if (surface.current) observer.observe(surface.current);
    if (panel.current) observer.observe(panel.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!open) return;
    const focus = requestAnimationFrame(() => panel.current?.focus({ preventScroll: true }));
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      close();
    };
    const preview = frame.current?.contentWindow;
    window.addEventListener('keydown', escape);
    preview?.addEventListener('keydown', escape);
    return () => {
      cancelAnimationFrame(focus);
      window.removeEventListener('keydown', escape);
      preview?.removeEventListener('keydown', escape);
    };
  }, [open, frame]);
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(''), 2200);
    return () => clearTimeout(timer);
  }, [feedback]);
  const startDrag = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('[data-no-drag]')) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, start: { x: event.clientX, y: event.clientY }, origin: position };
    setDragging(true);
  };
  const move = (event: PointerEvent<HTMLElement>) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    setPosition(clamp({ x: current.origin.x + event.clientX - current.start.x, y: current.origin.y + event.clientY - current.start.y }));
  };
  const endDrag = () => { drag.current = null; setDragging(false); };
  return (
    <div ref={surface} className={styles.surface} data-dialkit-floating>
      <div ref={anchor} className={styles.anchor} style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}>
        <motion.button ref={chip} type='button' className={styles.chip} data-open={open}
          aria-label={open ? 'Close DialKit' : 'Open DialKit'} aria-expanded={open} aria-controls={id}
          onClick={() => open ? close() : setOpen(true)}
          whileTap={reduced ? undefined : { scale: 0.97 }} transition={{ duration: 0.15, ease }}>
          <HugeiconsIcon icon={SlidersHorizontalIcon} size={16} strokeWidth={1.8} aria-hidden='true' />
          <span className={styles.count} title={`${count} control groups`}>{count}</span>
        </motion.button>
        <motion.section ref={panel} id={id} role='dialog' aria-label='DialKit' aria-modal={false} tabIndex={-1}
          aria-hidden={!open} inert={!open} className={styles.panel} data-open={open} data-dragging={dragging}
          initial={{ opacity: 0, scale: 0.965, y: -6 }} animate={{ opacity: open ? 1 : 0, scale: open ? 1 : 0.965, y: open ? 0 : -6 }}
          transition={{ duration: reduced ? 0 : open ? 0.22 : 0.14, ease }}
          style={{ pointerEvents: open ? 'auto' : 'none', transformOrigin: 'top right' } as CSSProperties}>
          <header className={styles.header} onPointerDown={startDrag} onPointerMove={move} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}>
            <button type='button' className={styles.grip} aria-label='Move DialKit panel' aria-describedby={`${id}-move-help`}
              onKeyDown={event => {
                const offsets: Record<string, Point> = { ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 } };
                if (event.key === 'Home') { event.preventDefault(); setPosition({ x: 0, y: 0 }); }
                const direction = offsets[event.key];
                if (!direction) return;
                event.preventDefault();
                const step = event.shiftKey ? 4 : 16;
                setPosition(previous => clamp({ x: previous.x + direction.x * step, y: previous.y + direction.y * step }));
              }}><HugeiconsIcon icon={SlidersHorizontalIcon} size={16} aria-hidden='true' /></button>
            <h2 className={styles.title}>DialKit</h2><span id={`${id}-move-help`} className={styles.srOnly}>Drag to move. Arrow keys move, Home resets.</span>
            {count > 0 && save && <button type='button' data-no-drag className={styles.reset} disabled={!canSave} onClick={async()=>{if(await save())setFeedback('Changes saved');}} aria-label='Save tuning'>{saving?'Saving':feedback==='Changes saved'?'Saved':'Save'}</button>}
            {count > 0 && <button type='button' data-no-drag className={styles.reset} aria-label='Reset tuning' onClick={() => { reset(); setResetCount(value => value + 1); setFeedback('Values reset'); }}>
              <motion.span animate={{ rotate: resetCount * -360 }} transition={{ duration: reduced ? 0 : 0.35, ease }}><HugeiconsIcon icon={Refresh01Icon} size={14} aria-hidden='true' /></motion.span>Reset
            </button>}
            <button type='button' data-no-drag className={styles.iconButton} aria-label='Collapse DialKit' onClick={close} title='Collapse · Esc'><HugeiconsIcon icon={Cancel01Icon} size={16} aria-hidden='true' /></button>
          </header>
          <div className={styles.scroll}>
            <div className={styles.controls}>{children}</div>
          </div>
          <span className={styles.srOnly} role='status'>{feedback}</span>
        </motion.section>
      </div>
    </div>
  );
}
