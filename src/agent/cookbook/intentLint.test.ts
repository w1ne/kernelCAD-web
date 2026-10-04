// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Authoring intent lint: each rule fires on a script shaped like real user
// code (usage triage 2026-10-03) and stays silent on the cookbook recipe that
// uses the right API. A rename of a referenced recipe, API or MCP tool breaks
// this file.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  INTENT_LINT_RULES,
  lintAuthoringIntent,
  cylinderSubtractCount,
  typedPointCount,
  readSource,
  resolveNumber,
} from './intentLint';
import { loadSnippets, search } from './index';
import { TOOL_REGISTRY } from '../mcp/toolRegistry';
import { DIAGNOSTIC_REGISTRY } from '../../shared/diagnostics/registry';

const codes = (src: string) => lintAuthoringIntent(src).map((d) => d.code);

// M4 bracket, holes cut by subtracting cylinders (the dominant real pattern).
const M4_BRACKET = `
// Wall bracket, 4x M4 screws
const t = param('thickness', 5);
const plate = box(60, 40, t);
const hole1 = cylinder(t + 2, 2.25).translate(10, 10, -1);
const hole2 = cylinder(t + 2, 2.25).translate(50, 10, -1);
const hole3 = cylinder(t + 2, 2.25).translate(10, 30, -1);
let body = plate.subtract(hole1);
body = body.subtract(hole2);
body = body.subtract(hole3);
body = body.subtract(cylinder(t + 2, 2.25).translate(50, 30, -1));
return body;
`;

// Hand-built involute: tooth points computed in a loop and unioned.
const HAND_INVOLUTE = `
// 20-tooth involute gear, module 1.5
const m = 1.5, z = 20;
const rb = (m * z / 2) * Math.cos(20 * Math.PI / 180);
const pts = [];
for (let i = 0; i <= 10; i++) {
  const t = i * 0.05;
  pts.push([rb * (Math.cos(t) + t * Math.sin(t)), rb * (Math.sin(t) - t * Math.cos(t))]);
}
let p = path().moveTo(pts[0][0], pts[0][1]);
for (const [x, y] of pts.slice(1)) p = p.lineTo(x, y);
const tooth = p.close().extrude(6);
let gear = cylinder(6, rb);
for (let k = 0; k < z; k++) gear = gear.union(tooth.rotateZ(k * 360 / z));
return gear;
`;

// Bent bracket faked with two boxes.
const FAKE_BEND = `
// sheet metal L bracket, 1.5 mm steel
const leg1 = box(80, 30, 1.5);
const leg2 = box(80, 1.5, 40).translate(0, 28.5, 0);
return leg1.union(leg2);
`;

// Snap-fit lid: hand-typed clearance, printed in PLA, no dfmSpec.
const SNAP_FIT = `
// Snap-fit lid for a PLA box (Bambu A1)
const printClearance = param('printClearance', 0.2, { min: 0, max: 1 });
const wall = 2;
const box1 = box(50, 40, 20).shell(['top'], wall);
const lid = box(50, 40, 2).translate(0, 0, 20)
  .union(box(50 - 2 * wall - 2 * printClearance, 40 - 2 * wall - 2 * printClearance, 3)
    .translate(wall + printClearance, wall + printClearance, 17));
const asm = assembly('snap-box');
asm.part('box', box1);
asm.part('lid', lid);
return asm.model();
`;

// 50-point outline typed by hand from a photo.
const OUTLINE_PTS = Array.from({ length: 50 }, (_, i) => {
  const a = (i / 50) * 2 * Math.PI;
  return `[${(40 * Math.cos(a)).toFixed(2)}, ${(25 * Math.sin(a)).toFixed(2)}]`;
});
const TYPED_OUTLINE = `
// Traced from the photo, ASSUMED scale
const outline = [
  ${OUTLINE_PTS.join(',\n  ')}
];
let p = path().moveTo(outline[0][0], outline[0][1]);
for (const [x, y] of outline.slice(1)) p = p.lineTo(x, y);
return p.close().extrude(3);
`;

describe('intent lint — fires on hand-built intent', () => {
  it('M4 bracket with subtracted cylinders → thread + hole-by-cylinder', () => {
    expect(codes(M4_BRACKET)).toEqual([
      'authoring.prefer-api.thread',
      'authoring.prefer-api.hole-by-cylinder',
    ]);
  });

  it('hand-built involute → gear', () => {
    expect(codes(HAND_INVOLUTE)).toEqual(['authoring.prefer-api.gear']);
  });

  it('bend faked with two boxes + "sheet metal" comment → sheet-metal', () => {
    expect(codes(FAKE_BEND)).toEqual(['authoring.prefer-api.sheet-metal']);
  });

  it('printClearance param + PLA comment, no dfmSpec → fdm-clearance', () => {
    expect(codes(SNAP_FIT)).toEqual(['authoring.prefer-api.fdm-clearance']);
  });

  it('50 hand-typed points → typed-trace', () => {
    expect(typedPointCount(TYPED_OUTLINE)).toBe(50);
    expect(codes(TYPED_OUTLINE)).toEqual(['authoring.prefer-api.typed-trace']);
  });

  it('explicit "tapped" with a plain hole() still fires the thread rule', () => {
    const src = `// tapped M3 holes\nreturn box(20, 20, 5).hole('top', { u: 0, v: 0, diameter: 2.5, depth: 'through' });`;
    expect(codes(src)).toEqual(['authoring.prefer-api.thread']);
  });

  it('cylinders made in a map or subtracted in a loop count as many holes', () => {
    const mapped = `
const pts = [[5, 5], [15, 5]];
const cutters = pts.map(([x, y]) => cylinder(10, 1.6).translate(x, y, -1));
return box(20, 10, 5).subtract(...cutters);`;
    const looped = `
let b = box(20, 10, 5);
for (const [x, y] of [[5, 5], [15, 5]]) {
  b = b.subtract(cylinder(10, 1.6).translate(x, y, -1));
}
return b;`;
    expect(cylinderSubtractCount(mapped)).toBeGreaterThanOrEqual(3);
    expect(cylinderSubtractCount(looped)).toBeGreaterThanOrEqual(3);
    expect(codes(mapped)).toContain('authoring.prefer-api.hole-by-cylinder');
    expect(codes(looped)).toContain('authoring.prefer-api.hole-by-cylinder');
  });

  it('every diagnostic is info, one line, and names its cookbook recipe', () => {
    const all = [M4_BRACKET, HAND_INVOLUTE, FAKE_BEND, SNAP_FIT, TYPED_OUTLINE].flatMap(lintAuthoringIntent);
    expect(all).toHaveLength(6);
    for (const d of all) {
      const rule = INTENT_LINT_RULES.find((r) => r.code === d.code)!;
      expect(d.severity).toBe('info');
      expect(d.message).not.toContain('\n');
      expect(d.hint).toBe(DIAGNOSTIC_REGISTRY[d.code].hintTemplate);
      expect(d.nextAction).toEqual(DIAGNOSTIC_REGISTRY[d.code].nextAction);
      for (const id of rule.cookbookIds) {
        expect(d.message).toContain(id);
        expect(d.hint).toContain(id);
      }
    }
  });
});

describe('intent lint — silent when the right API is used', () => {
  const snippets = loadSnippets();
  const body = (id: string) => snippets.find((s) => s.id === id)!.body;

  // Each rule must not fire on the recipe it points to.
  const SILENT: Array<[recipeId: string, code: string]> = [
    ['threaded-hole-tap-drill', 'authoring.prefer-api.thread'],
    ['heat-set-insert-pilot', 'authoring.prefer-api.thread'],
    ['clearance-hole-through-plate', 'authoring.prefer-api.thread'],
    ['clearance-hole-through-plate', 'authoring.prefer-api.hole-by-cylinder'],
    ['involute-spur-gear-pair', 'authoring.prefer-api.gear'],
    ['sheet-metal-l-bracket-bend', 'authoring.prefer-api.sheet-metal'],
    ['fdm-fit-clearance-by-fit-type', 'authoring.prefer-api.fdm-clearance'],
    ['resolve-photo-trace-assumptions', 'authoring.prefer-api.typed-trace'],
  ];
  for (const [id, code] of SILENT) {
    it(`${id} does not get ${code}`, () => {
      expect(codes(body(id))).not.toContain(code);
    });
  }

  it('a plain box gets no hints, and empty input is safe', () => {
    expect(lintAuthoringIntent('return box(10, 10, 10);')).toEqual([]);
    expect(lintAuthoringIntent('')).toEqual([]);
    expect(lintAuthoringIntent(undefined)).toEqual([]);
  });
});

describe('intent lint — needs an actionable target', () => {
  // The words alone are not enough: something in the code must be what the
  // named API replaces. A hint with nothing to convert sends the agent to
  // "fix" the wrong thing and retry.
  it('thread words with nothing fastener-like cut → silent', () => {
    const src = `// Decorative knob, thread it onto the M6 stud by hand later
return cylinder(12, 15).union(box(4, 30, 12).translate(-2, -15, 0));`;
    expect(codes(src)).toEqual([]);
  });

  it('thread words + a fastener-sized subtracted cylinder → thread', () => {
    const src = `// tapped M3 boss
return cylinder(10, 5).subtract(cylinder(12, 1.25).translate(0, 0, -1));`;
    expect(codes(src)).toEqual(['authoring.prefer-api.thread']);
  });

  it('M-size + only a large subtracted bore (not a fastener) → silent', () => {
    const src = `// M4 screws hold the lid elsewhere; this is the 40 mm cable port
const r = 20;
return box(80, 80, 5).subtract(cylinder(7, r).translate(40, 40, -1));`;
    expect(codes(src)).toEqual([]);
  });

  it('gear words with no loop or pattern building teeth → silent', () => {
    const src = `// Gear housing cover, module 1 gears live inside
return box(60, 40, 3);`;
    expect(codes(src)).toEqual([]);
  });

  it('sheet metal words with no plate-like stock → silent', () => {
    const src = `// Sheet metal enclosure goes around this cast block (k-factor n/a)
return box(40, 40, 40);`;
    expect(codes(src)).toEqual([]);
  });

  it('a print clearance that the geometry never uses → silent', () => {
    const src = `// PLA print
const printClearance = 0.2;
return box(20, 20, 10);`;
    expect(codes(src)).toEqual([]);
  });

  it('a clearance for a non-FDM process, or on all-metal parts → silent', () => {
    const laser = `// Laser-cut plywood; 3D-printed parts want 0.2
const fit = 0.1;
return box(20, 20 + 2 * fit, 6);`;
    const steel = `// printed (FDM) variant optional
const gap = 0.1;
const a = assembly('x');
a.part('nut', box(10, 10 + gap, 5), { material: 'mild-steel' });
return a.model();`;
    expect(codes(laser)).toEqual([]);
    expect(codes(steel)).toEqual([]);
  });

  it('non-intent senses of the words → silent', () => {
    const chain = `// a chain is threaded through the lug
return box(10, 10, 4).hole('top', { u: 0, v: 0, diameter: 3, depth: 'through' });`;
    const palette = `let b = box(10, 10, 2);
for (let i = 0; i < 4; i++) b = b.union(box(1, 1, 1).translate(i * 2, 0, 2));
return b.color('gear');`;
    const knurl = `// 18 knurl teeth on the shaft
let s = cylinder(10, 3);
for (let i = 0; i < 18; i++) s = s.union(box(0.4, 0.4, 10).rotateZ(i * 20).translate(3, 0, 0));
return s;`;
    expect(codes(chain)).toEqual([]);
    expect(codes(palette)).toEqual([]);
    expect(codes(knurl)).toEqual([]);
  });
});

describe('intent lint — a comment that negates its own mention is skipped', () => {
  const PLAIN_SCREW_HOLE = `return box(30, 20, 5).hole('top', { u: 0, v: 0, diameter: 3.4, depth: 'through' });`;
  const NEGATIONS = [
    '// Screws are cylinder stand-ins, NOT a swept 60° V-thread.',
    '// Clearance hole only, no thread.',
    '// The thread is not modelled.',
    '// This script does not model the thread.',
    "// Thread callout is schematic only.",
    '// Thread shown for reference only.',
    '// Not a real tapped hole;\n// the insert is pressed in.',
  ];
  for (const comment of NEGATIONS) {
    it(`silent on: ${comment.replace(/\n/g, ' ')}`, () => {
      expect(codes(`${comment}\n${PLAIN_SCREW_HOLE}`)).toEqual([]);
    });
  }

  it('a negated sentence does not hide a positive one in the same comment', () => {
    const src = `// The nut is not modelled. The bore is tapped M3.\n${PLAIN_SCREW_HOLE}`;
    expect(codes(src)).toEqual(['authoring.prefer-api.thread']);
  });

  it('a negation runs across // lines of one comment', () => {
    const src = `// Screws are heads + clearance shanks — NOT a swept\n// 60° V-thread (see the bolt snippet).\n${PLAIN_SCREW_HOLE}`;
    expect(readSource(src).prose).not.toMatch(/thread/i);
    expect(codes(src)).toEqual([]);
  });

  it('tslot-frame-fastener-bom: the "NOT a V-thread" disclaimer gets no thread hint', () => {
    const body = loadSnippets().find((s) => s.id === 'tslot-frame-fastener-bom')!.body;
    expect(body).toMatch(/V-thread/);
    expect(codes(body)).not.toContain('authoring.prefer-api.thread');
  });

  it('a "//" inside a string is not a comment', () => {
    const src = `const url = 'https://example.com/thread';\nreturn box(1, 1, 1);`;
    expect(readSource(src).code).toContain('https://example.com/thread');
  });
});

describe('intent lint — number resolving', () => {
  it('resolves literals, arithmetic, Math.PI, known names and param defaults', () => {
    const nums = new Map([['t', 5]]);
    expect(resolveNumber('2.25', nums)).toBe(2.25);
    expect(resolveNumber('(t + 2) / 2', nums)).toBe(3.5);
    expect(resolveNumber('-t * 2', nums)).toBe(-10);
    expect(resolveNumber("param('d', 3.4, { min: 1 })", nums)).toBe(3.4);
    expect(resolveNumber('Math.PI', nums)).toBeCloseTo(Math.PI);
    expect(resolveNumber('spec.d / 2', nums)).toBeUndefined();
    expect(resolveNumber('holeD.divide(2)', nums)).toBeUndefined();
  });
});

describe('intent lint — zero hints on the cookbook', () => {
  // The cookbook is our own reference code: a hint on it is either a snippet
  // to fix or a rule to narrow. One known exception, and it must keep firing
  // so the entry is removed the day its cause is fixed:
  // rebuild-model-from-drawing-pdf reproduces drawing_to_cad output, and
  // src/agent/drawing/emit.ts still cuts each hole as a subtracted cylinder.
  // The hint is a true positive whose fix belongs in the emitter.
  const KNOWN: Record<string, string[]> = {
    'rebuild-model-from-drawing-pdf': ['authoring.prefer-api.hole-by-cylinder'],
  };
  const snippets = loadSnippets();

  it('lints every snippet', () => {
    expect(snippets.length).toBeGreaterThanOrEqual(85);
  });

  for (const s of snippets) {
    it(`${s.id}: no authoring.prefer-api.* hints`, () => {
      expect(codes(s.body).filter((c) => c.startsWith('authoring.prefer-api.'))).toEqual(KNOWN[s.id] ?? []);
    });
  }
});

describe('intent lint — every referenced recipe, API and tool exists', () => {
  const snippets = loadSnippets();
  const ids = new Set(snippets.map((s) => s.id));
  const toolNames = new Set(TOOL_REGISTRY.map((e) => e.definition.name));
  const apiSource = ['src/modeling/api.ts', 'src/modeling/capture/proxy.ts']
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');

  for (const rule of INTENT_LINT_RULES) {
    it(`${rule.code}: cookbook ids, APIs, tools and nextAction resolve`, () => {
      expect(rule.cookbookIds.length).toBeGreaterThan(0);
      for (const id of rule.cookbookIds) expect(ids, `cookbook id ${id}`).toContain(id);
      for (const api of rule.apis) {
        expect(apiSource, `script API ${api}(`).toMatch(new RegExp(String.raw`^\s*${api}\s*[(:]`, 'm'));
        expect(rule.message).toContain(`${api}(`);
      }
      for (const tool of rule.tools) {
        expect(toolNames, `MCP tool ${tool}`).toContain(tool);
        expect(rule.message).toContain(tool);
      }
      const next = DIAGNOSTIC_REGISTRY[rule.code].nextAction;
      if (next.kind === 'call-tool') {
        expect(toolNames).toContain(next.tool);
        if (next.tool === 'lookup_cookbook') {
          // The nextAction query must actually reach the recipe.
          const top3 = search(String(next.args.query), snippets, 3).map((h) => h.snippet.id);
          expect(top3).toContain(rule.cookbookIds[0]);
        }
      }
    });
  }
});
