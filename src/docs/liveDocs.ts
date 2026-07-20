// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Page model for the live docs at kernelcad.com/docs.
//
// One page per CHEAT_SHEET_TAXONOMY group. Signatures and descriptions are read
// out of listApi through `resolveEntry`, exactly as scripts/buildCheatSheet.ts
// does, so a page cannot describe an API the runtime no longer has. The only
// prose authored here is the example captions and the notes on what the browser
// cannot do — everything table-shaped is generated.
//
// The examples are the reason this file exists rather than the cheat sheet
// being enough: each one is executed in tests through `runScriptInBrowser`, the
// same entry point the Run button uses, so a broken example fails CI instead of
// failing a reader.
//
// EXAMPLES MUST BE PLAIN JAVASCRIPT. The docs page ships no TypeScript
// compiler (3.40 MB raw / 0.97 MB gzipped), and `transpileBrowser` refuses TS
// syntax by name rather than mis-parsing it. A `: number` annotation in an
// example is a Run button that always errors.

import {
  CHEAT_SHEET_TAXONOMY,
  resolveEntry,
  type CheatSheetGroup,
} from '../agent/mcp/tools/cheatSheetTaxonomy';

/** A rendered API row: the call as an author spells it, plus one line on it. */
export interface DocsEntry {
  /** e.g. `Shape.fillet(radius, edges?, opts?)` — receiver prefix included. */
  readonly call: string;
  /** First sentence of the listApi description. */
  readonly summary: string;
}

/** A runnable example. `code` is evaluated by the Run button, verbatim. */
export interface DocsExample {
  /** Plain JavaScript. No TypeScript syntax — see the file header. */
  readonly code: string;
  /** What the reader is looking at, and why it is written this way. */
  readonly caption: string;
}

export interface DocsPage {
  /** URL slug, matching the cheat sheet's anchor rule. */
  readonly slug: string;
  readonly task: string;
  readonly blurb: string;
  readonly entries: readonly DocsEntry[];
  /** Null when the group's calls cannot run in a browser; `note` says why. */
  readonly example: DocsExample | null;
  /** Shown when something on this page needs the CLI. */
  readonly note: string | null;
}

/**
 * Slug for a task heading. Must stay identical to the anchor rule in
 * scripts/buildCheatSheet.ts so cheat-sheet anchors and docs URLs agree.
 */
export function slugForTask(task: string): string {
  return task.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/ /g, '-');
}

/** First sentence — the table needs one line, not a paragraph. */
function firstSentence(description: string): string {
  const s = description.split(/(?<=[.!?])\s/)[0] ?? description;
  return s.trim();
}

/**
 * Examples, keyed by task heading. Each is executed through the browser runtime
 * in liveDocsExamples.browser.test.ts and must produce at least one feature
 * record and at least one mesh.
 */
const EXAMPLES: Readonly<Record<string, DocsExample>> = {
  'Start a shape': {
    caption:
      'A primitive gives you a solid straight away; a closed path gives you a profile to extrude. color() takes a role token or a hex string.',
    code: `const plate = box(60, 40, 8);

const rib = path()
  .moveTo(0, 0)
  .lineTo(60, 0)
  .lineTo(60, 14)
  .lineTo(0, 4)
  .close()
  .extrude(6)
  .translate(0, 12, 8);

return plate.union(rib).color('frame');`,
  },

  'Add material': {
    caption:
      'A revolved knob. Draw half the section as a closed path, then spin it. finish() names the material; the color option tints the anodised surface.',
    code: `const section = path()
  .moveTo(4, 0)
  .lineTo(16, 0)
  .lineTo(16, 6)
  .lineTo(9, 22)
  .lineTo(4, 22)
  .close();

return section.revolve().finish('anodized', { color: '#2F6F63' });`,
  },

  'Remove material': {
    caption:
      'hole() places a bore by position on a named face. You give it where the hole goes and it builds the cutting cylinder for you. u and v are millimetres from the centre of that face.',
    code: `const plate = box(80, 50, 10);

return plate
  .hole('top', { u: -20, v: 0, diameter: 8, depth: 'through' })
  .hole('top', {
    u: 20,
    v: 0,
    diameter: 6,
    depth: 'through',
    counterbore: { diameter: 12, depth: 4 },
  })
  .finish('aluminium');`,
  },

  'Combine shapes': {
    caption:
      'intersect() keeps only the overlap. Lower the sphere radius and the carved corner shrinks.',
    code: `const block = box(40, 40, 40);
const ball = sphere(26).translate(20, 20, 20);

return block.intersect(ball).color('beam');`,
  },

  'Finish edges': {
    caption:
      'The order of these two steps changes the result. Shelling first leaves the wall a constant thickness; filleting first would round the outside and then hollow the rounded body.',
    code: `const body = box(60, 40, 24).shell(2, { face: 'top' });

// A light anodised blue over the shelled wall and rounded corners.
return body.fillet(3, { atZ: 0 }).finish('anodized', { color: '#7FA6C4' });`,
  },

  'Select geometry': {
    caption:
      'The query returns the edges it matched, so you can check what you selected before building on it.',
    code: `const plate = box(80, 50, 10);

const topEdges = await selectEdges(plate, { atZ: 10 });
if (topEdges.length !== 4) {
  throw new Error('expected 4 edges on the top face, got ' + topEdges.length);
}

return plate.fillet(3, { atZ: 10 });`,
  },

  'Place & transform': {
    caption:
      'One boss, patterned around the hub axis. The count stays editable afterwards because the kernel records the pattern as a feature. cylinder() takes height first, then radius; the boss ring has to clear the hub radius or the copies end up inside it.',
    code: `const hub = cylinder(12, 16);
const boss = cylinder(12, 5).translate(20, 0, 0);

return hub
  .union(boss.patternCircular({ count: 6, axis: [0, 0, 1] }))
  .color('frame');`,
  },

  'Assemble': {
    caption:
      'A base and a lid joined by one revolute mate, solved at 35 degrees. The mate refers to the two connectors, and the solver puts the lid where the hinge allows. The two colours make it easy to see which part moved.',
    code: `const arm = assembly('clamshell');

const base = arm.part('base', box(60, 40, 10).color('frame'));
const lid = arm.part('lid', box(60, 40, 6).translate(0, 0, 10).color('tool'));

base.connector('pivot', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 20, 10] },
  axis: [1, 0, 0],
});
lid.connector('pivot', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 20, 0] },
  axis: [1, 0, 0],
});

arm.mate('hinge', 'base.pivot', 'lid.pivot', 'revolute', { limitsDeg: [0, 120] });

return arm.solvedModel({ hinge: 35 });`,
  },

  'Curves & surfaces': {
    caption:
      'Curves and surfaces are measurable before they become solids. pointAt() reads a point off the curve; thicken() turns the surface into one.',
    code: `const rail = nurbsCurve([
  [0, 0, 0],
  [30, 0, 20],
  [60, 20, 20],
  [80, 40, 0],
]);

const mid = rail.pointAt(0.5);
if (mid.length !== 3) {
  throw new Error('pointAt should return a 3D point');
}

const panel = nurbsSurface({
  controls: [
    [[0, 0, 0], [0, 30, 10], [0, 60, 0]],
    [[30, 0, 12], [30, 30, 26], [30, 60, 12]],
    [[60, 0, 0], [60, 30, 10], [60, 60, 0]],
  ],
  degree: { u: 2, v: 2 },
});

return panel.thicken(2).color('beam');`,
  },

  'Measure & verify': {
    caption:
      'boundingBox() asks the kernel what you actually built. Here it checks the fillet did not change the overall width.',
    code: `const bracket = box(60, 40, 12).fillet(3);

const bb = await bracket.boundingBox();
if (Math.abs(bb.size[0] - 60) > 1e-6) {
  throw new Error('fillet changed the overall width: ' + bb.size[0]);
}

return bracket;`,
  },

  'Parametrize': {
    caption:
      'param() returns a ParamRef, not a number. JS operators throw on one, so arithmetic goes through .subtract() and .multiply().',
    code: `const width = param('width', 60);
const wall = param('wall', 4);

const inner = width.subtract(wall.multiply(2));

return box(width, 40, 12).subtract(
  box(inner, 30, 8).translate(wall, 5, 4),
);`,
  },

  'Annotate & present': {
    caption:
      'finish(\'copper\') gives the bracket copper\'s colour and surface in one call. Change it to finish(\'abs\') and the same bracket looks like black plastic. Glass and clearcoat still go through material({...}).',
    code: `const bracket = box(60, 40, 12)
  .fillet(2)
  .hole('top', { u: 0, v: 0, diameter: 12, depth: 'through' });

return bracket.finish('copper');`,
  },
};

/**
 * Groups whose calls need a filesystem, and so cannot demonstrate anything in a
 * browser tab. `lib.fromSTEP` and friends throw a `cli.host-fs-unavailable`
 * diagnostic here rather than half-working, so the page says so instead of
 * shipping an example that always errors.
 */
const NOTES: Readonly<Record<string, string>> = {
  'Import & export': [
    'These calls read and write files, so they need the CLI (`npm install -g kernelcad`) or the MCP server.',
    'In a browser they raise `cli.host-fs-unavailable`.',
  ].join(' '),
  'Annotate & present': [
    '`referenceImage` and custom TTF fonts via `fontPath` need a filesystem and are CLI-only.',
    'Colour, material, camera and lighting all run here.',
  ].join(' '),
};

function entriesFor(group: CheatSheetGroup): DocsEntry[] {
  const out: DocsEntry[] = [];
  for (const name of group.names) {
    for (const { source, entry } of resolveEntry(name)) {
      // Same call spelling as the cheat sheet: bare signature for functions,
      // ` : ` for value-shaped entries like `q` whose signature is an object.
      const call = `${source.callPrefix}${entry.name}${
        entry.signature.startsWith('(') ? entry.signature : ` : ${entry.signature}`
      }`;
      out.push({ call, summary: firstSentence(entry.description) });
    }
  }
  return out;
}

/** Every docs page, in taxonomy order (which is build order). */
export function buildDocsPages(): DocsPage[] {
  return CHEAT_SHEET_TAXONOMY.map((group) => ({
    slug: slugForTask(group.task),
    task: group.task,
    blurb: group.blurb,
    entries: entriesFor(group),
    example: EXAMPLES[group.task] ?? null,
    note: NOTES[group.task] ?? null,
  }));
}

/** Task headings that carry a runnable example, for the browser-run test. */
export function exampleTasks(): string[] {
  return Object.keys(EXAMPLES);
}
