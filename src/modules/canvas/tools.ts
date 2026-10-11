// The tools an agent uses on a canvas, defined once. The app's live API (agent.ts, in the open
// browser tab) and the command line (cli.ts, on the file) both run them from here, so they behave
// the same and `help` describes both. Pure: elements in, elements out, and nothing imported from
// Excalidraw.
//
// The tools are meant to be enough to use Excalidraw fluently: shapes, text, arrows, lines, sticky
// notes, frames, and the views and documents of a prototype. `create` and `update` take Excalidraw's
// own vocabulary (colors, stroke, fill), and the shortcuts (notes, artifacts, sections) are just
// conveniences on top of it.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { artifactSlug } from '../../platform/core/fileTypes.ts';
import {
  NOTE_COLORS,
  NOTE_SIZE,
  NOTE_TEXT_COLOR,
  ToolError,
  arrowEnds,
  boundsOf,
  bump,
  centerLabel,
  color,
  labelFor,
  make,
  measureText,
  labelRoom,
  textElement,
  textHeight,
  unionBounds,
  wrapText,
  type El,
} from './elements.ts';

export { ToolError, type El };

// What the tools need to know about the app around the canvas.
export type ArtifactInfo = {
  path: string;
  sourcePath?: string;
  title: string;
  type: string;
  typeLabel: string;
  preview: boolean;
};
export type Ctx = {
  // The canvas’s own permanent prototype address.
  base: string;
  // The artifact at its permanent app address, or null.
  artifact(path: string): ArtifactInfo | null;
  // The artifacts in this prototype, for the `artifacts` tool and hints. A canvas shows only its own prototype's artifacts.
  artifacts?(): ArtifactInfo[];
  // A link's app path: "https://host/patrick/x" is "/patrick/x". App paths pass through. Null if it isn't a link into the app.
  linkPath?(link: string): string | null;
};

// How big things start out. A view is a screen (1440 x 900 at a third of the size); a card is one row.
const ARTIFACT_WIDTH = 480;
const PREVIEW_HEIGHT = 338;
const CARD_HEIGHT = 88;
const GAP = 80;
const NOTE_GAP = 24;
const SECTION_GAP = 120;
const SECTION_PAD = 60;
const MAX_CREATE = 200;

// ---- help -------------------------------------------------------------------------------------

export type ToolDef = { name: string; live?: true; summary: string; args: Record<string, string>; example: unknown };

const STYLE_ARGS = {
  color:
    'shortcut for stroke and background together: a name (red, pink, grape, violet, blue, cyan, teal, green, yellow, orange, gray) or hex. On a sticky note: yellow, pink, blue, or green',
  stroke: 'outline and text color: a name, a hex value, or "none"',
  background: 'fill color: a name (its light shade), a hex value, or "none"',
  strokeWidth: 'number, 1 (thin) to 4 (bold)',
  strokeStyle: '"solid", "dashed", or "dotted"',
  opacity: '0 to 100',
  rounded: 'true for rounded corners (rectangles and diamonds)',
};

export const TOOLS: ToolDef[] = [
  {
    name: 'context',
    live: true,
    summary:
      'Where you are: the canvas, what the person has selected, and what they are looking at. Use it to make sense of "this" and "here".',
    args: {},
    example: {},
  },
  {
    name: 'describe',
    summary:
      'Read the canvas as data: every element with its kind, position, size, text, colors and links (artifacts are named), plus sections. Look before you change things, and again after.',
    args: {
      scope:
        '"all" (default), "selection" (what the person has selected), or "view" (what is on their screen). The last two need the open canvas.',
      ids: 'only these elements (and their labels)',
    },
    example: { scope: 'selection' },
  },
  {
    name: 'artifacts',
    summary:
      "The views and documents you can put on the canvas with an `artifact`: their names, titles and types. A canvas shows only its own prototype's.",
    args: {},
    example: {},
  },
  {
    name: 'create',
    summary:
      'Make things. Pass { elements: [...] } (or one element). Each has a `type`; see help("create") for the types. Placement: x and y, or `below`, `rightOf` (an id or @ref), or `section`. With none, it goes below everything. `align` sets how it lines up with what it is beside: "start" (left edge under something, top edge beside it) or "center" (centered on it). `rightOf` centers by default, so arrows between things of different heights run straight; `below` aligns left. The result lists `warnings` if something landed on top of something else. `ref` names it, so later elements in the same call can use @name.',
    args: {
      elements: 'a list of elements to make',
      type: 'note, text, rectangle, ellipse, diamond, arrow, line, artifact, or section',
      align: '"start" or "center", with below / rightOf',
      ...STYLE_ARGS,
    },
    example: {
      elements: [
        { type: 'artifact', artifact: 'lofi/main', ref: 'main' },
        { type: 'note', text: 'Retry keeps the draft', below: '@main', color: 'pink' },
        { type: 'rectangle', text: 'Payment', rightOf: '@main', color: 'blue', ref: 'pay' },
        { type: 'arrow', from: '@main', to: '@pay', text: 'continue' },
      ],
    },
  },
  {
    name: 'update',
    summary:
      'Change something that is there. Pass its id and any of the properties below; only those change. Text on a note, shape or arrow is its label.',
    args: {
      id: 'the element to change (or `ids` for several)',
      text: 'new text (a label, for a shape, note or arrow)',
      fontSize: 'text size',
      x: 'number',
      y: 'number',
      width: 'number',
      height: 'number',
      name: "a section's title",
      artifact: 'point an artifact at another view or document',
      from: "an arrow's start (an id)",
      to: "an arrow's end (an id)",
      locked: 'true to lock it in place',
      ...STYLE_ARGS,
    },
    example: { id: 'abc123', text: 'Retry keeps the draft and the amount', color: 'yellow' },
  },
  {
    name: 'move',
    summary:
      'Move something by dx and dy, or to x and y. A section takes what is in it, a label goes with its shape, and arrows attached to it follow.',
    args: { id: 'the element (or `ids`)', dx: 'number', dy: 'number', x: 'number', y: 'number' },
    example: { id: 'abc123', dx: 0, dy: 120 },
  },
  {
    name: 'delete',
    summary:
      'Remove elements. Their labels and any arrows attached to them go too. A section keeps its contents unless `withContents` is true.',
    args: { id: 'the element (or `ids`)', withContents: 'true to remove a section and everything in it' },
    example: { ids: ['abc123', 'def456'] },
  },
  {
    name: 'point',
    live: true,
    summary:
      'Select these elements and scroll to them, so the person sees which one you mean. Use it when you say "this one".',
    args: { ids: 'the elements' },
    example: { ids: ['abc123'] },
  },
  {
    name: 'screenshot',
    live: true,
    summary:
      'A PNG (as a data URL) of the canvas, or of some elements. Views show as plain boxes; use describe for what they are.',
    args: { ids: 'only these (and what is in them)', scale: '0.1 to 4' },
    example: { scale: 1 },
  },
  {
    name: 'help',
    summary: 'This list. help("create") explains the element types.',
    args: { tool: 'a tool name, for its details' },
    example: 'create',
  },
];

const ELEMENT_TYPES: Record<string, { summary: string; args: Record<string, string>; example: unknown }> = {
  note: {
    summary: 'A sticky note: a square you write on. Use it for annotations, questions, and what to look at.',
    args: {
      text: 'what it says. It wraps to the note, and the note gets taller if the text needs it',
      color: 'yellow (default), pink, blue, or green',
      width: 'default 200',
      height: 'default 200 (taller if the text needs it)',
    },
    example: { type: 'note', text: 'Retry keeps the draft', color: 'pink', below: '@main' },
  },
  text: {
    summary: 'Plain text with no box: a heading or a label.',
    args: {
      text: 'what it says (\\n for a new line). A line longer than 560 wraps to that width',
      width: 'wrap to this width (20 to 4000), for a paragraph',
      fontSize: 'default 20; 28 for a heading',
      ...STYLE_ARGS,
    },
    example: { type: 'text', text: 'Onboarding flow', fontSize: 28, x: 0, y: -80 },
  },
  rectangle: {
    summary: 'A rectangle, ellipse or diamond, with an optional label inside. Boxes for steps, groups, and states.',
    args: {
      text: 'a label inside',
      width: 'default 200',
      height: 'default 120',
      fontSize: 'label size, default 20',
      ...STYLE_ARGS,
    },
    example: { type: 'rectangle', text: 'Payment', color: 'blue', rounded: true, x: 600, y: 0 },
  },
  arrow: {
    summary:
      'An arrow (or a plain `line`). Between two elements, give `from` and `to` (ids or @refs): it stays attached when they move. Otherwise give a start (x, y, or placement) and dx, dy, or `points`.',
    args: {
      from: 'an id or @ref',
      to: 'an id or @ref',
      dx: 'number',
      dy: 'number',
      points: 'a list of [x, y] steps from the start',
      text: 'a label on the arrow',
      head: '"arrow" (default for arrows), "triangle", "dot", "bar", or "none"',
      startHead: 'the same, for the start',
      ...STYLE_ARGS,
    },
    example: { type: 'arrow', from: '@a', to: '@b', text: 'then' },
  },
  artifact: {
    summary:
      'An artifact from this prototype, on the canvas. Views and diagrams have live previews; other artifacts are cards with an Open link. It must be from this prototype: a canvas shows only its own. Its title bar opens it.',
    args: {
      artifact: 'its path in this prototype without the extension ("lofi/main")',
      width: 'default 480',
      height: 'default 338 for a preview, 88 for a card',
    },
    example: { type: 'artifact', artifact: 'lofi/main', ref: 'main' },
  },
  section: {
    summary:
      'A titled frame around things that go together. Give `children` (ids or @refs) and it wraps them; give only a size and put things in it with `section`.',
    args: {
      name: 'its title',
      children: 'ids or @refs to put in it',
      width: 'default fits the children',
      height: 'default fits the children',
    },
    // Sections clip what sticks out; these grow to hold anything put into them with `section`.
    example: { type: 'section', name: 'Edge cases', children: ['@a', '@b'] },
  },
};

// Details of one tool, or the list of all.
export function help(tool?: string) {
  if (!tool)
    return {
      tools: TOOLS.map(({ name, live, summary }) => ({
        name,
        summary,
        ...(live ? { needs: 'the open canvas in a browser' } : {}),
      })),
    };
  const def = TOOLS.find(t => t.name === tool);
  if (!def) throw new ToolError(`no tool "${tool}". Tools: ${TOOLS.map(t => t.name).join(', ')}`);
  return { ...def, ...(tool === 'create' ? { types: ELEMENT_TYPES } : {}) };
}

// ---- running a tool ---------------------------------------------------------------------------

export type Run = {
  elements: El[]; // the whole scene, deleted elements included
  result: unknown;
  touched: string[]; // ids made or changed, for the caller to re-measure
};

// Runs a tool on a scene. Never changes what it's given; returns the new scene.
export function run(scene: El[], tool: string, args: any, ctx: Ctx): Run {
  const input = args ?? {};
  switch (tool) {
    case 'describe':
      return { elements: scene, result: describe(scene, input, ctx), touched: [] };
    case 'artifacts':
      return { elements: scene, result: listArtifacts(ctx), touched: [] };
    case 'create':
      return create(scene, input, ctx);
    case 'update':
      return update(scene, input, ctx);
    case 'move':
      return move(scene, input);
    case 'delete':
      return remove(scene, input);
    case 'help':
      return { elements: scene, result: help(typeof input === 'string' ? input : input.tool), touched: [] };
    default:
      throw new ToolError(
        `no tool "${tool}" here. Tools: ${TOOLS.filter(t => !t.live)
          .map(t => t.name)
          .join(', ')}`,
      );
  }
}

const live = (scene: El[]) => scene.filter(el => !el.isDeleted);
const labelOf = (scene: El[], el: El) => scene.find(t => t.containerId === el.id && !t.isDeleted && t.type === 'text');
// A note is a rectangle with a note's fill and its edge color: a shape colored "blue" has the same fill, but not the edge.
const noteColorName = (el: El) =>
  el.type === 'rectangle'
    ? Object.entries(NOTE_COLORS).find(([, c]) => c.fill === el.backgroundColor && c.edge === el.strokeColor)?.[0]
    : undefined;
const isNote = (el: El) => noteColorName(el) !== undefined;
const isArtifact = (el: El) => el.type === 'embeddable' && typeof el.link === 'string';

function num(value: unknown, field: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new ToolError(`${field} must be a number`);
  return value;
}

// A width or height someone asked for: a number, kept to a size a canvas can hold.
function size(value: unknown, field: string): number | undefined {
  const n = num(value, field);
  if (n !== undefined && (n < 20 || n > 4000)) throw new ToolError(`${field} must be between 20 and 4000`);
  return n;
}

// Free text wraps to this width when a line is longer, so a paragraph reads as one. Give `width` for another.
const TEXT_WRAP_WIDTH = 560;

function str(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new ToolError(`${field} must be text`);
  if (value.length > 4000) throw new ToolError(`${field} is longer than 4000 characters`);
  return value;
}

// An element by id, or by @ref within a call.
function finder(scene: () => El[], refs: Record<string, string> = Object.create(null)) {
  return (id: unknown, field: string): El => {
    if (typeof id !== 'string')
      throw new ToolError(`${field} must be an element id${Object.keys(refs).length ? ' or an @ref' : ''}`);
    const real = id.startsWith('@') ? refs[id.slice(1)] : id;
    const el = real && scene().find(e => e.id === real && !e.isDeleted);
    if (!el)
      throw new ToolError(
        `${field}: no element ${id}. Use an id from describe${
          Object.keys(refs).length
            ? ` or an @ref made earlier in this call (${Object.keys(refs)
                .map(r => `@${r}`)
                .join(', ')})`
            : ''
        }`,
      );
    return el;
  };
}

// The app path an `artifact` argument means.
function artifactPath(value: unknown, ctx: Ctx): string {
  const given = str(value, 'artifact').trim();
  const asPath = ctx.linkPath?.(given) ?? (given.startsWith('/') ? given : null);
  const sourcePath = given.replace(/^\.?\//, '');
  const matches = asPath
    ? []
    : (ctx.artifacts?.() ?? []).filter(
        item =>
          item.sourcePath === sourcePath ||
          (item.sourcePath && artifactSlug(item.sourcePath) === artifactSlug(sourcePath)),
      );
  if (matches.length > 1) throw new ToolError(`ambiguous artifact source path ${given}`);
  const path = asPath ?? matches[0]?.path ?? `${ctx.base}/${sourcePath}`;
  // A canvas shows only its own prototype's artifacts, so a prototype stays self-contained.
  if (!path.startsWith(`${ctx.base}/`))
    throw new ToolError(
      `${given} is in another prototype. A canvas shows only artifacts from its own (${ctx.base}). Copy the view into this prototype first, then put that copy on the canvas`,
    );
  // Without the extension: "lofi/main.tsx" is "lofi/main".
  return path
    .split('/')
    .map((part, i, all) => (i === all.length - 1 ? artifactSlug(part) : part))
    .join('/')
    .replace(/\/$/, '');
}

function styleOf(spec: El, kind: 'shape' | 'text' | 'line' = 'shape'): El {
  const out: El = {};
  if (spec.color !== undefined) {
    out.strokeColor = color(spec.color, 'stroke', 'color');
    if (kind === 'shape') {
      out.backgroundColor = color(spec.color, 'background', 'color');
      out.fillStyle = 'solid';
    }
  }
  if (spec.stroke !== undefined) out.strokeColor = color(spec.stroke, 'stroke');
  if (spec.background !== undefined) {
    out.backgroundColor = color(spec.background, 'background');
    out.fillStyle = 'solid';
  }
  if (spec.strokeWidth !== undefined) out.strokeWidth = num(spec.strokeWidth, 'strokeWidth');
  if (spec.strokeStyle !== undefined) {
    if (!['solid', 'dashed', 'dotted'].includes(spec.strokeStyle))
      throw new ToolError('strokeStyle must be "solid", "dashed", or "dotted"');
    out.strokeStyle = spec.strokeStyle;
  }
  if (spec.opacity !== undefined) out.opacity = Math.min(100, Math.max(0, num(spec.opacity, 'opacity')!));
  if (spec.rounded !== undefined) out.roundness = spec.rounded ? { type: 3 } : null;
  return out;
}

const ARROWHEADS = ['arrow', 'triangle', 'dot', 'bar', 'none'];
function head(value: unknown, fallback: string | null, field: string): string | null {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !ARROWHEADS.includes(value))
    throw new ToolError(`${field} must be one of ${ARROWHEADS.map(h => `"${h}"`).join(', ')}`);
  return value === 'none' ? null : value;
}

// The points of an arrow or line, relative to its start, and the box around them.
function pointsBox(points: number[][]) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}

// An arrow's label sits at the middle of the arrow.
function placeArrowLabel(arrow: El, label: El): El {
  const b = boundsOf(arrow);
  return { ...label, x: b.x + b.width / 2 - label.width / 2, y: b.y + b.height / 2 - label.height / 2 };
}

// An artifact's app path as `artifact` takes it inside this prototype: "lofi/main".
const relative = (path: string, ctx: Ctx) => (path.startsWith(`${ctx.base}/`) ? path.slice(ctx.base.length + 1) : path);

function listArtifacts(ctx: Ctx) {
  const artifacts = (ctx.artifacts?.() ?? []).map(i => ({
    artifact: i.sourcePath ?? relative(i.path, ctx),
    title: i.title,
    type: i.typeLabel,
    ...(i.preview ? { shownAs: 'live preview' } : { shownAs: 'card' }),
  }));
  return { artifacts };
}

// ---- create -----------------------------------------------------------------------------------

function create(input: El[], args: any, ctx: Ctx): Run {
  const specs: El[] | null = Array.isArray(args)
    ? args
    : Array.isArray(args.elements)
      ? args.elements
      : args.type
        ? [args]
        : null;
  if (!specs?.length)
    throw new ToolError(
      'create needs { elements: [...] }: a list of things to make, each with a `type`. help("create") lists the types.',
    );
  if (specs.length > MAX_CREATE) throw new ToolError(`at most ${MAX_CREATE} elements per call`);

  let scene = input.slice();
  const refs: Record<string, string> = Object.create(null); // names come from the caller: no '__proto__' surprises
  const created: string[] = [];
  const touched = new Set<string>();
  const find = finder(() => scene, refs);
  const replace = (id: string, patch: El) => {
    touched.add(id);
    scene = scene.map(el => (el.id === id ? bump(el, patch) : el));
  };
  const add = (...els: El[]) => {
    scene = scene.concat(els);
    els.forEach(el => touched.add(el.id));
  };

  // Where a new element goes: given, beside or under another element, at the end of a section, or below everything.
  const place = (spec: El, width: number, height = 0) => {
    const align = spec.align ?? undefined;
    if (align !== undefined && align !== 'start' && align !== 'center')
      throw new ToolError('align must be "start" or "center"');
    const x = num(spec.x, 'x');
    const y = num(spec.y, 'y');
    if (x !== undefined && y !== undefined) return { x, y };
    if (spec.below !== undefined) {
      const b = boundsOf(find(spec.below, 'below'));
      return { x: x ?? (align === 'center' ? b.x + (b.width - width) / 2 : b.x), y: y ?? b.y + b.height + NOTE_GAP };
    }
    if (spec.rightOf !== undefined) {
      const b = boundsOf(find(spec.rightOf, 'rightOf'));
      return { x: x ?? b.x + b.width + GAP, y: y ?? (align === 'start' ? b.y : b.y + (b.height - height) / 2) };
    }
    if (spec.section !== undefined) {
      const frame = find(spec.section, 'section');
      const kids = live(scene).filter(el => el.frameId === frame.id && !(el.type === 'text' && el.containerId));
      if (!kids.length) return { x: frame.x + SECTION_PAD, y: frame.y + SECTION_PAD };
      const b = unionBounds(kids.map(boundsOf))!;
      return { x: b.x + b.width + GAP, y: b.y };
    }
    const all = unionBounds(
      live(scene)
        .filter(el => !(el.type === 'text' && el.containerId))
        .map(boundsOf),
    );
    return all ? { x: x ?? all.x, y: y ?? all.y + all.height + SECTION_GAP } : { x: x ?? 0, y: y ?? 0 };
  };
  const grow = new Set<string>(); // sections that things were put into, to be made big enough
  const notices: string[] = []; // things made bigger than asked, so the caller knows
  const frameOf = (spec: El) => {
    if (spec.section === undefined) return null;
    const id = find(spec.section, 'section').id;
    grow.add(id);
    return id;
  };

  for (const [i, spec] of specs.entries()) {
    try {
      if (!spec || typeof spec !== 'object') throw new ToolError('each element must be an object with a `type`');
      const inFrame = frameOf(spec);
      const inSection = (el: El): El => (inFrame ? { ...el, frameId: inFrame } : el);
      let made: El[] = [];
      switch (spec.type) {
        case 'note': {
          const c = NOTE_COLORS[spec.color ?? 'yellow'];
          if (!c) throw new ToolError(`a note's color must be one of ${Object.keys(NOTE_COLORS).join(', ')}`);
          const w = size(spec.width, 'width') ?? NOTE_SIZE;
          const asked = size(spec.height, 'height');
          // A note grows to hold its text: text that doesn't fit would spill out over what's below it.
          const needed = Math.ceil((textHeight(str(spec.text ?? '', 'text'), w - 20, 20) + 20) / 20) * 20;
          const h = Math.max(asked ?? NOTE_SIZE, needed);
          if (asked !== undefined && needed > asked)
            notices.push(
              `a note was made ${h} tall, not ${asked}, to fit its text. Shorten the text or give it more width.`,
            );
          const at = place(spec, w, h);
          const rect = make('rectangle', {
            ...at,
            width: w,
            height: h,
            backgroundColor: c.fill,
            fillStyle: 'solid',
            strokeColor: c.edge,
            strokeWidth: 1,
            roughness: 0,
            roundness: null,
          });
          const label: El = {
            ...textElement({
              text: str(spec.text ?? '', 'text'),
              x: at.x + 10,
              y: at.y + 10,
              containerId: rect.id,
              boxWidth: w - 20,
              stroke: NOTE_TEXT_COLOR,
            }),
            verticalAlign: 'top',
          };
          made = [{ ...rect, boundElements: [{ id: label.id, type: 'text' }] }, label];
          break;
        }
        case 'text': {
          const fontSize = num(spec.fontSize, 'fontSize') ?? 20;
          const text = str(spec.text, 'text');
          // Text keeps the lines it was given. A line longer than TEXT_WRAP_WIDTH, or any with a `width`, wraps.
          const asked = size(spec.width, 'width');
          const width = asked ?? (measureText(text, fontSize).width > TEXT_WRAP_WIDTH ? TEXT_WRAP_WIDTH : undefined);
          const box = width ? { width, height: textHeight(text, width, fontSize) } : measureText(text, fontSize);
          const at = place(spec, box.width, box.height);
          made = [
            textElement({
              text,
              ...at,
              fontSize,
              boxWidth: width,
              fixedWidth: width !== undefined,
              stroke:
                spec.stroke !== undefined || spec.color !== undefined ? styleOf(spec, 'text').strokeColor : undefined,
            }),
          ];
          break;
        }
        case 'rectangle':
        case 'ellipse':
        case 'diamond': {
          const w = size(spec.width, 'width') ?? 200;
          const asked = size(spec.height, 'height');
          let h = asked ?? 120;
          // A rectangle grows to hold its label. (An ellipse or diamond has less room inside, and can't just
          // grow taller, so it gets a notice instead.)
          if (spec.text) {
            const fontSize = num(spec.fontSize, 'fontSize') ?? 20;
            const needed = textHeight(str(spec.text, 'text'), labelRoom(spec.type, w), fontSize) + 24;
            if (needed > h) {
              if (spec.type === 'rectangle') {
                if (asked !== undefined)
                  notices.push(`a box was made ${Math.ceil(needed / 10) * 10} tall, not ${asked}, to fit its label.`);
                h = Math.ceil(needed / 10) * 10;
              } else
                notices.push(
                  `the label "${String(spec.text).slice(0, 24)}" may not fit inside its ${spec.type}. Make it bigger or the label shorter.`,
                );
            }
          }
          const at = place(spec, w, h);
          const shape = make(spec.type, { ...at, width: w, height: h, ...styleOf(spec) });
          if (spec.text) {
            const label = labelFor(
              shape,
              str(spec.text, 'text'),
              num(spec.fontSize, 'fontSize') ?? 20,
              spec.stroke !== undefined || spec.color !== undefined ? shape.strokeColor : undefined,
            );
            made = [{ ...shape, boundElements: [{ id: label.id, type: 'text' }] }, label];
          } else made = [shape];
          break;
        }
        case 'arrow':
        case 'line': {
          const isArrow = spec.type === 'arrow';
          let from: El | undefined;
          let to: El | undefined;
          let at: { x: number; y: number };
          let points: number[][];
          if (spec.from !== undefined || spec.to !== undefined) {
            if (!isArrow)
              throw new ToolError('only arrows can join elements (from, to). A line takes x, y and dx, dy or points');
            if (spec.from === undefined || spec.to === undefined)
              throw new ToolError('an arrow between elements needs both `from` and `to`');
            from = find(spec.from, 'from');
            to = find(spec.to, 'to');
            const { start, end } = arrowEnds(from, to);
            at = start;
            points = [
              [0, 0],
              [end.x - start.x, end.y - start.y],
            ];
          } else {
            at = place(spec, 0);
            points = Array.isArray(spec.points)
              ? [
                  [0, 0],
                  ...spec.points.map((p: any, n: number) => {
                    if (!Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite))
                      throw new ToolError(`points[${n}] must be [x, y]`);
                    return p as number[];
                  }),
                ]
              : [
                  [0, 0],
                  [num(spec.dx, 'dx') ?? 200, num(spec.dy, 'dy') ?? 0],
                ];
          }
          const arrow = make(spec.type, {
            ...at,
            ...pointsBox(points),
            points,
            ...styleOf(spec, 'line'),
            ...(isArrow
              ? {
                  startBinding: from ? { elementId: from.id, focus: 0, gap: 8 } : null,
                  endBinding: to ? { elementId: to.id, focus: 0, gap: 8 } : null,
                  startArrowhead: head(spec.startHead, null, 'startHead'),
                  endArrowhead: head(spec.head, 'arrow', 'head'),
                  elbowed: false,
                }
              : { polygon: false }),
          });
          made = [arrow];
          if (spec.text) {
            const label = placeArrowLabel(
              arrow,
              textElement({ text: str(spec.text, 'text'), x: 0, y: 0, containerId: arrow.id, align: 'center' }),
            );
            made = [{ ...arrow, boundElements: [{ id: label.id, type: 'text' }] }, label];
          }
          for (const end of [from, to])
            if (end)
              replace(end.id, {
                boundElements: [
                  ...(scene.find(e => e.id === end.id)!.boundElements ?? []),
                  { id: arrow.id, type: 'arrow' },
                ],
              });
          break;
        }
        case 'artifact': {
          const path = artifactPath(spec.artifact, ctx);
          const info = ctx.artifact(path);
          if (!info) {
            const here = ctx
              .artifacts?.()
              .slice(0, 20)
              .map(i => i.sourcePath ?? relative(i.path, ctx));
            throw new ToolError(
              `no artifact at ${path}${here?.length ? `. In this prototype: ${here.join(', ')} (the \`artifacts\` tool lists them)` : ''}`,
            );
          }
          const w = num(spec.width, 'width') ?? ARTIFACT_WIDTH;
          const h = num(spec.height, 'height') ?? (info.preview ? PREVIEW_HEIGHT : CARD_HEIGHT);
          made = [
            make('embeddable', {
              ...place(spec, w, h),
              width: w,
              height: h,
              link: path,
              strokeColor: 'transparent',
              roundness: null,
              customData: { frame: true, hideLinkIcon: true },
            }),
          ];
          break;
        }
        case 'section':
        case 'frame': {
          const kids = (spec.children ?? []).map((id: unknown, n: number) => find(id, `children[${n}]`));
          const name = str(spec.name ?? spec.title ?? '', 'name');
          let box: { x: number; y: number; width: number; height: number };
          if (kids.length) {
            const b = unionBounds(kids.map(boundsOf))!;
            box = {
              x: b.x - SECTION_PAD,
              y: b.y - SECTION_PAD,
              width: b.width + SECTION_PAD * 2,
              height: b.height + SECTION_PAD * 2,
            };
          } else {
            const w = num(spec.width, 'width') ?? 1200;
            box = { ...place(spec, w), width: w, height: num(spec.height, 'height') ?? 600 };
          }
          const frame = make('frame', { ...box, name });
          made = [frame];
          add(...made);
          for (const kid of kids) {
            replace(kid.id, { frameId: frame.id });
            const label = labelOf(scene, kid);
            if (label) replace(label.id, { frameId: frame.id });
          }
          made = [];
          created.push(frame.id);
          if (spec.ref) refs[spec.ref] = frame.id;
          continue;
        }
        default:
          throw new ToolError(
            `unknown type ${JSON.stringify(spec.type)}. Types: note, text, rectangle, ellipse, diamond, arrow, line, artifact, section`,
          );
      }
      made = made.map(inSection);
      add(...made);
      created.push(made[0].id);
      if (spec.ref !== undefined) {
        if (typeof spec.ref !== 'string' || !spec.ref) throw new ToolError('ref must be a name');
        refs[spec.ref] = made[0].id;
      }
    } catch (error) {
      if (error instanceof ToolError)
        throw new ToolError(`elements[${i}]${spec?.type ? ` (${spec.type})` : ''}: ${error.message}`);
      throw error;
    }
  }
  // Say so if something landed on top of something else, so the caller can move it.
  const top = (el: El) => !['arrow', 'line', 'frame'].includes(el.type) && !(el.type === 'text' && el.containerId);
  const newOnes = created.map(id => scene.find(e => e.id === id)!).filter(top);
  const before = live(input).filter(top);
  const warnings: string[] = [...notices];
  const name = (el: El) => `${el.id} (${kindOf(el)}${el.text ? ` "${String(el.text).slice(0, 24)}"` : ''})`;
  const meet = (a: El, b: El) =>
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  newOnes.forEach((a, i) => {
    for (const b of [...before, ...newOnes.slice(i + 1)])
      if (a.id !== b.id && meet(boundsOf(a) as El, boundsOf(b) as El)) warnings.push(`${name(a)} overlaps ${name(b)}`);
  });

  // A section clips what sticks out of it, so one that things were put into grows to hold them (never shrinks).
  for (const id of grow) {
    const frame = scene.find(e => e.id === id)!;
    const inside = live(scene).filter(e => e.frameId === id && !(e.type === 'text' && e.containerId));
    const b = unionBounds(inside.map(boundsOf));
    if (!b) continue;
    const width = Math.max(frame.width, b.x + b.width + SECTION_PAD - frame.x);
    const height = Math.max(frame.height, b.y + b.height + SECTION_PAD - frame.y);
    if (width > frame.width || height > frame.height) replace(id, { width, height });
  }
  return {
    elements: scene,
    result: { ok: true, created, refs, ...(warnings.length ? { warnings } : {}) },
    touched: [...touched],
  };
}

// ---- update, move, delete ---------------------------------------------------------------------

const idsOf = (args: any, field = 'id') => {
  const ids = Array.isArray(args.ids) ? args.ids : args.id !== undefined ? [args.id] : null;
  if (!ids?.length) throw new ToolError(`give the ${field} (or \`ids\`) of what to change. Use describe to see ids`);
  return ids as string[];
};

// Re-routes an arrow joining two elements after either moved, and moves its label.
function reroute(scene: El[], arrowId: string): El[] {
  const arrow = scene.find(e => e.id === arrowId)!;
  const a = arrow.startBinding && scene.find(e => e.id === arrow.startBinding.elementId && !e.isDeleted);
  const b = arrow.endBinding && scene.find(e => e.id === arrow.endBinding.elementId && !e.isDeleted);
  if (!a || !b) return scene;
  const { start, end } = arrowEnds(a, b);
  const moved = bump(arrow, {
    x: start.x,
    y: start.y,
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
    points: [
      [0, 0],
      [end.x - start.x, end.y - start.y],
    ],
  });
  return scene.map(e => {
    if (e.id === arrow.id) return moved;
    if (e.containerId === arrow.id && e.type === 'text') return bump(e, placeArrowLabel(moved, e));
    return e;
  });
}

const arrowsTouching = (scene: El[], ids: Set<string>) =>
  live(scene)
    .filter(e => e.type === 'arrow' && (ids.has(e.startBinding?.elementId) || ids.has(e.endBinding?.elementId)))
    .map(e => e.id);

const UPDATABLE = [
  'text',
  'fontSize',
  'x',
  'y',
  'width',
  'height',
  'name',
  'artifact',
  'from',
  'to',
  'locked',
  'color',
  'stroke',
  'background',
  'strokeWidth',
  'strokeStyle',
  'opacity',
  'rounded',
];

function update(input: El[], args: any, ctx: Ctx): Run {
  const ids = idsOf(args);
  const touched = new Set<string>();
  let scene = input.slice();
  const find = finder(() => scene);
  const set = (id: string, patch: El) => {
    touched.add(id);
    scene = scene.map(e => (e.id === id ? bump(e, patch) : e));
  };
  const unknown = Object.keys(args).filter(k => !['id', 'ids', ...UPDATABLE].includes(k));
  if (unknown.length)
    throw new ToolError(`update can't change ${unknown.join(', ')}. It can change: ${UPDATABLE.join(', ')}`);
  if (!Object.keys(args).some(k => UPDATABLE.includes(k)))
    throw new ToolError(`update needs something to change: ${UPDATABLE.join(', ')}`);

  for (const id of ids) {
    let el = find(id, 'id');
    const patch: El = {};
    // A note's color is one of four; on anything else, `color` styles the outline and fill.
    if (args.color !== undefined && isNote(el)) {
      const c = NOTE_COLORS[args.color];
      if (!c) throw new ToolError(`a note's color must be one of ${Object.keys(NOTE_COLORS).join(', ')}`);
      Object.assign(patch, { backgroundColor: c.fill, strokeColor: c.edge });
    } else
      Object.assign(
        patch,
        styleOf(args, el.type === 'text' ? 'text' : el.type === 'arrow' || el.type === 'line' ? 'line' : 'shape'),
      );
    for (const key of ['x', 'y', 'width', 'height'] as const)
      if (args[key] !== undefined) patch[key] = num(args[key], key);
    if (args.locked !== undefined) patch.locked = Boolean(args.locked);
    if (args.name !== undefined) {
      if (el.type !== 'frame') throw new ToolError(`${id}: name is a section's title`);
      patch.name = str(args.name, 'name');
    }
    if (args.artifact !== undefined) {
      if (!isArtifact(el)) throw new ToolError(`${id}: artifact applies to artifacts on the canvas`);
      const path = artifactPath(args.artifact, ctx);
      if (!ctx.artifact(path)) throw new ToolError(`no artifact at ${path}`);
      patch.link = path;
    }
    if ((args.from !== undefined || args.to !== undefined) && el.type !== 'arrow')
      throw new ToolError(`${id}: from and to apply to arrows`);
    if (args.from !== undefined) patch.startBinding = { elementId: find(args.from, 'from').id, focus: 0, gap: 8 };
    if (args.to !== undefined) patch.endBinding = { elementId: find(args.to, 'to').id, focus: 0, gap: 8 };
    if (args.fontSize !== undefined && el.type === 'text') {
      patch.fontSize = num(args.fontSize, 'fontSize');
      Object.assign(patch, measureText(el.text, patch.fontSize));
    }
    set(el.id, patch);
    el = find(el.id, 'id');
    // A label takes its shape's outline color (a note's text stays dark).
    if (patch.strokeColor !== undefined && !isNote(el)) {
      const label = labelOf(scene, el);
      if (label) set(label.id, { strokeColor: patch.strokeColor });
    }

    // Text: a text element's own, or the label of a note, shape or arrow.
    if (
      args.text !== undefined ||
      args.fontSize !== undefined ||
      args.width !== undefined ||
      args.height !== undefined ||
      args.x !== undefined ||
      args.y !== undefined
    ) {
      const value = args.text !== undefined ? str(args.text, 'text') : undefined;
      if (el.type === 'text' && !el.containerId && value !== undefined)
        set(el.id, {
          text: value,
          originalText: value,
          ...(el.autoResize === false
            ? { height: textHeight(value, el.width, el.fontSize) }
            : measureText(value, el.fontSize)),
        });
      else if (el.type !== 'text') {
        const label = labelOf(scene, el);
        if (label || value) {
          const fontSize = num(args.fontSize, 'fontSize') ?? label?.fontSize ?? 20;
          const words = value ?? label!.originalText ?? label!.text;
          let next: El;
          if (el.type === 'arrow')
            next = placeArrowLabel(
              el,
              textElement({ text: words, x: 0, y: 0, fontSize, containerId: el.id, align: 'center' }),
            );
          else if (isNote(el)) {
            next = {
              ...textElement({
                text: words,
                x: el.x + 10,
                y: el.y + 10,
                fontSize,
                containerId: el.id,
                boxWidth: el.width - 20,
                stroke: NOTE_TEXT_COLOR,
              }),
              verticalAlign: 'top',
            };
            // The note grows to hold its text.
            const needed = Math.ceil((next.height + 20) / 20) * 20;
            if (needed > el.height) set(el.id, { height: needed });
          } else {
            next = labelFor(el, words, fontSize, label?.strokeColor);
            if (el.type === 'rectangle' && next.height + 24 > el.height) {
              set(el.id, { height: Math.ceil((next.height + 24) / 10) * 10 });
              next = centerLabel({ ...el, height: Math.ceil((next.height + 24) / 10) * 10 }, next);
            }
          }
          if (label)
            set(label.id, {
              text: next.text,
              originalText: next.originalText,
              fontSize,
              width: next.width,
              height: next.height,
              x: next.x,
              y: next.y,
            });
          else {
            const made: El = { ...next, ...(el.frameId ? { frameId: el.frameId } : {}) };
            scene = scene
              .concat(made)
              .map(e =>
                e.id === el.id
                  ? bump(e, { boundElements: [...(e.boundElements ?? []), { id: made.id, type: 'text' }] })
                  : e,
              );
            touched.add(made.id);
            touched.add(el.id);
          }
        }
      }
    }
    // An arrow joined to something that changed follows it.
    for (const arrowId of new Set([
      ...arrowsTouching(scene, new Set([el.id])),
      ...(el.type === 'arrow' && (args.from !== undefined || args.to !== undefined) ? [el.id] : []),
    ])) {
      scene = reroute(scene, arrowId);
      touched.add(arrowId);
    }
  }
  return { elements: scene, result: { ok: true, updated: ids }, touched: [...touched] };
}

function move(input: El[], args: any): Run {
  const ids = idsOf(args);
  if (['dx', 'dy', 'x', 'y'].every(k => args[k] === undefined)) throw new ToolError('move needs dx and dy, or x and y');
  if ((args.x !== undefined || args.y !== undefined) && ids.length > 1)
    throw new ToolError('x and y place one element; use dx and dy to move several');
  const find = finder(() => input);
  let scene = input.slice();
  const moving = new Set<string>();
  for (const id of ids) {
    const el = find(id, 'id');
    const dx = num(args.dx, 'dx') ?? (num(args.x, 'x') ?? el.x) - el.x;
    const dy = num(args.dy, 'dy') ?? (num(args.y, 'y') ?? el.y) - el.y;
    const group = new Set([el.id]);
    // A section takes what is in it; a shape takes its label.
    if (el.type === 'frame')
      live(scene)
        .filter(e => e.frameId === el.id)
        .forEach(e => group.add(e.id));
    live(scene)
      .filter(e => e.type === 'text' && e.containerId && group.has(e.containerId))
      .forEach(e => group.add(e.id));
    scene = scene.map(e => (group.has(e.id) ? bump(e, { x: e.x + dx, y: e.y + dy }) : e));
    group.forEach(g => moving.add(g));
  }
  // Arrows joined to what moved follow it (arrows that moved with it already did).
  const touched = new Set(moving);
  for (const arrowId of arrowsTouching(scene, moving)) {
    if (moving.has(arrowId)) continue;
    scene = reroute(scene, arrowId);
    touched.add(arrowId);
  }
  return { elements: scene, result: { ok: true, moved: ids }, touched: [...touched] };
}

function remove(input: El[], args: any): Run {
  const ids = idsOf(args);
  const find = finder(() => input);
  const gone = new Set<string>();
  for (const id of ids) {
    const el = find(id, 'id');
    gone.add(el.id);
    live(input)
      .filter(e => e.containerId === el.id)
      .forEach(e => gone.add(e.id));
    if (el.type === 'frame' && args.withContents)
      live(input)
        .filter(e => e.frameId === el.id)
        .forEach(e => gone.add(e.id));
  }
  // An arrow attached to something deleted goes with it, and so does its label.
  for (const e of live(input))
    if (e.type === 'arrow' && (gone.has(e.startBinding?.elementId) || gone.has(e.endBinding?.elementId)))
      gone.add(e.id);
  for (const e of live(input)) if (e.containerId && gone.has(e.containerId)) gone.add(e.id);
  const frames = new Set(ids.filter(id => input.find(e => e.id === id)?.type === 'frame'));
  const touched: string[] = [];
  const scene = input.map(e => {
    if (gone.has(e.id)) {
      touched.push(e.id);
      return bump(e, { isDeleted: true });
    }
    const patch: El = {};
    if (e.frameId && frames.has(e.frameId) && !args.withContents) patch.frameId = null;
    // Nothing keeps a reference to what was deleted.
    if ((e.boundElements ?? []).some((b: El) => gone.has(b.id)))
      patch.boundElements = e.boundElements.filter((b: El) => !gone.has(b.id));
    if (e.startBinding && gone.has(e.startBinding.elementId)) patch.startBinding = null;
    if (e.endBinding && gone.has(e.endBinding.elementId)) patch.endBinding = null;
    if (Object.keys(patch).length) {
      touched.push(e.id);
      return bump(e, patch);
    }
    return e;
  });
  return { elements: scene, result: { ok: true, deleted: [...gone] }, touched };
}

// ---- describe ---------------------------------------------------------------------------------

const round = (n: number) => Math.round(n);

function describe(scene: El[], args: any, ctx: Ctx) {
  const elements = live(scene);
  const byId = new Map(elements.map(e => [e.id, e]));
  const only = Array.isArray(args.ids) ? new Set<string>(args.ids) : null;
  const artifacts = [];
  for (const el of elements) {
    if (el.type === 'text' && el.containerId) continue; // a label is part of what it labels
    if (only && !only.has(el.id) && !(el.frameId && only.has(el.frameId))) continue;
    const b = boundsOf(el);
    const label = labelOf(elements, el);
    const out: El = {
      id: el.id,
      kind: kindOf(el),
      x: round(b.x),
      y: round(b.y),
      width: round(b.width),
      height: round(b.height),
    };
    if (el.type !== 'text' && el.type !== 'frame' && el.type !== 'embeddable') out.shape = el.type;
    const words =
      el.type === 'text' ? (el.originalText ?? el.text) : label ? (label.originalText ?? label.text) : undefined;
    if (words !== undefined) out.text = words;
    if (isNote(el)) out.color = noteColorName(el);
    else if (el.type !== 'embeddable' && el.type !== 'frame') {
      if (el.strokeColor && el.strokeColor !== '#1e1e1e') out.stroke = el.strokeColor;
      if (el.backgroundColor && el.backgroundColor !== 'transparent') out.background = el.backgroundColor;
    }
    if (el.type === 'text' && el.fontSize) out.fontSize = el.fontSize;
    if (el.type !== 'text' && el.type !== 'embeddable' && el.type !== 'frame' && !isNote(el)) {
      if (el.strokeStyle && el.strokeStyle !== 'solid') out.strokeStyle = el.strokeStyle;
      if (el.strokeWidth && el.strokeWidth !== 2) out.strokeWidth = el.strokeWidth;
      if (el.roundness) out.rounded = true;
    }
    if (el.opacity !== undefined && el.opacity < 100) out.opacity = el.opacity;
    if (el.type === 'frame') out.name = el.name ?? '';
    if (el.type === 'arrow') {
      out.from = el.startBinding?.elementId ?? null;
      out.to = el.endBinding?.elementId ?? null;
    }
    if (isArtifact(el)) {
      const path = ctx.linkPath?.(el.link) ?? el.link;
      const info = path ? ctx.artifact(path) : null;
      out.link = path;
      out.artifact = info ? { title: info.title, type: info.typeLabel } : null;
    } else if (el.type === 'embeddable') out.link = el.link;
    if (el.frameId && byId.get(el.frameId)) out.section = el.frameId;
    if (el.locked) out.locked = true;
    artifacts.push(out);
  }
  const boxes = elements.filter(e => !(e.type === 'text' && e.containerId)).map(boundsOf);
  const all = unionBounds(boxes);
  return {
    elements: artifacts,
    sections: elements.filter(e => e.type === 'frame').map(f => ({ id: f.id, name: f.name ?? '' })),
    bounds: all && { x: round(all.x), y: round(all.y), width: round(all.width), height: round(all.height) },
  };
}

function kindOf(el: El) {
  switch (el.type) {
    case 'frame':
      return 'section';
    case 'embeddable':
      return isArtifact(el) ? 'artifact' : 'embed';
    case 'rectangle':
      return isNote(el) ? 'note' : 'shape';
    case 'ellipse':
    case 'diamond':
      return 'shape';
    case 'freedraw':
      return 'drawing';
    default:
      return el.type;
  }
}

// Kept for the app's live API, which lays out text itself.
export { centerLabel, wrapText };
