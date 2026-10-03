// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Authoring intent lint — usage triage 2026-10-03, P0 item 2.
//
// On 1062 real user scripts the intent was in the source but the API was not:
// 66 mention threads / M-sizes and 1 uses hole({ thread }); 34 mention gears
// and 2 use spurGear; 68 mention sheet metal and 0 use sheetMetal(). Agents
// rarely call lookup_cookbook, but every agent calls evaluate_script. So this
// static scan rides on the evaluate result: one `info` diagnostic per rule,
// naming the API and the cookbook recipe.
//
// Pure text scan of the source. No kernel work, never changes geometry, never
// fails an evaluation. Comments count: agents write their intent there.

import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { DIAGNOSTIC_REGISTRY, NEXT_ACTIONS, type DiagnosticCode } from '../../shared/diagnostics/registry';

export interface IntentLintRule {
  code: DiagnosticCode;
  /** Cookbook snippet ids the message names. Tested to exist. */
  cookbookIds: readonly string[];
  /** Script API calls the message names. Tested to exist. */
  apis: readonly string[];
  /** MCP tools the message names. Tested to exist. */
  tools: readonly string[];
  fires(src: string): boolean;
  message: string;
}

// ---------------------------------------------------------------- matchers --

/** Shape method call `.hole(` / `.holes(` — a user helper named `hole(` is not the API. */
const HOLE_CALL = /\.\s*holes?\s*\(/;
const THREAD_OPTION = /\bthread\s*:/;
const THREAD_WORDS = /\bthread(?:s|ed)?\b|\btapped\b|\btap[- ]?drill\b|\btapping\b/i;
const METRIC_SIZE = /\bM(?:2|2\.5|3|4|5|6|8|10|12)\b/;
const INSERT_WORDS = /\bheat[- ]?set\b|\b(?:threaded|brass|knurled|M\d(?:\.\d)?)\s+inserts?\b/i;
/** Purchased fasteners from the parts library carry their own thread. */
const LIB_PART = /\blib\.\w+/;

const GEAR_API = /\b(?:spurGear|ringGear|internalSpurGear|internalGear)\s*\(/;
const GEAR_WORDS = /\bgears?\b|\binvolute\b|\bgear[- ]?module\b|\bmodule(?:Mm)?\s*[:=]\s*\d/i;
const TEETH = /\bteeth\b/i;
/** Pulleys, combs and saws have teeth too; spurGear is not their API. */
const NON_GEAR_TEETH = /\bpulleys?\b|\bbelts?\b|\bgt2\b|\bhtd\b|\btiming\b|\bcombs?\b|\bsaws?\b|\bzip/i;

const SHEET_METAL_API = /\bsheetMetal\s*\(/;
const SHEET_METAL_WORDS = /\bsheet[- ]?metal\b|\bflat[- ]?pattern\b|\bk[- ]?factor\b/i;
const BEND_WORDS = /\bbend(?:s|ing)?\b|\bbent\b/i;
/** Pipes, tubes, wires and swept paths bend too; sheetMetal is not their API. */
const NON_SHEET_BEND = /\bpipes?\b|\btubes?\b|\btubing\b|\bwires?\b|\bcables?\b|\bsweep|\bhoses?\b|\brods?\b/i;

const DFM_SPEC_API = /\bdfmSpec\s*\(/;
const CLEARANCE_NAME =
  /\b(?:const|let|var)\s+\w*(?:clearance|fit|gap|tolerance)\w*\s*[:=]|\bparam\s*\(\s*['"`][\w ]*(?:clearance|fit|gap|tolerance)/i;
const FDM_WORDS = /\bprint(?:s|ed|ing|able)?\b|\bfdm\b|\bpla\b|\bpetg\b|\bbambu\b|\bprusa\b/i;

const TRACE_TOOLS = /\btrace_from_image\b|\bresolve_assumptions\b/;
const NUM = String.raw`-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?`;
const PAIR = new RegExp(String.raw`\[\s*${NUM}\s*,\s*${NUM}\s*\]|\{\s*x\s*:\s*${NUM}\s*,\s*y\s*:\s*${NUM}\s*\}`, 'g');
const LINE_TO_LITERAL = new RegExp(String.raw`\.lineTo\(\s*${NUM}\s*,\s*${NUM}\s*\)`, 'g');
/** Only whitespace, commas and comments may sit between two pairs of one run. */
const PAIR_GAP = /^(?:\s|,|\/\/[^\n]*|\/\*[\s\S]*?\*\/)*$/;
const TYPED_TRACE_MIN = 40;

const CYLINDER_TOOL = /\b(?:cylinder|extrudeCircle|circle)\s*\(/g;
const LOOP_TEXT = /\.(?:map|flatMap|forEach|reduce)\s*\(|\bArray\.from\s*\(|\bfor\s*\(|\bwhile\s*\(/;
const HOLE_BY_CYLINDER_MIN = 3;

// ------------------------------------------------------------- the rules --

export const INTENT_LINT_RULES: readonly IntentLintRule[] = [
  {
    code: 'authoring.prefer-api.thread',
    cookbookIds: ['threaded-hole-tap-drill', 'heat-set-insert-pilot'],
    apis: ['hole'],
    tools: [],
    fires: (src) =>
      (THREAD_WORDS.test(src) && !(HOLE_CALL.test(src) && THREAD_OPTION.test(src)) && !LIB_PART.test(src)) ||
      ((METRIC_SIZE.test(src) || INSERT_WORDS.test(src)) && !HOLE_CALL.test(src)),
    message:
      'Script names a thread / M-size / insert but no hole() carries it: use hole(face, { diameter, thread: { pitch } }) (cookbook threaded-hole-tap-drill; inserts: heat-set-insert-pilot).',
  },
  {
    code: 'authoring.prefer-api.hole-by-cylinder',
    cookbookIds: ['clearance-hole-through-plate'],
    apis: ['holes'],
    tools: [],
    fires: (src) => !HOLE_CALL.test(src) && cylinderSubtractCount(src) >= HOLE_BY_CYLINDER_MIN,
    message:
      'Holes are cut by subtracting cylinders: use holes(face, { positions, diameter, depth }) so export, drawings and DFM see real hole features (cookbook clearance-hole-through-plate).',
  },
  {
    code: 'authoring.prefer-api.gear',
    cookbookIds: ['involute-spur-gear-pair'],
    apis: ['spurGear', 'ringGear'],
    tools: [],
    fires: (src) => (GEAR_WORDS.test(src) || (TEETH.test(src) && !NON_GEAR_TEETH.test(src))) && !GEAR_API.test(src),
    message:
      'Script names gears but builds the teeth by hand: use spurGear({ module, teeth, faceWidth, backlash }), ringGear() for internal teeth (cookbook involute-spur-gear-pair).',
  },
  {
    code: 'authoring.prefer-api.sheet-metal',
    cookbookIds: ['sheet-metal-l-bracket-bend'],
    apis: ['sheetMetal', 'bend'],
    tools: ['flatten_pattern'],
    fires: (src) =>
      (SHEET_METAL_WORDS.test(src) || (BEND_WORDS.test(src) && !NON_SHEET_BEND.test(src))) && !SHEET_METAL_API.test(src),
    message:
      'Script names sheet metal / bends but fakes them with solids: use sheetMetal(profile, { thickness, kFactor }).bend(...) and MCP flatten_pattern (cookbook sheet-metal-l-bracket-bend).',
  },
  {
    code: 'authoring.prefer-api.fdm-clearance',
    cookbookIds: ['fdm-fit-clearance-by-fit-type'],
    apis: ['dfmSpec'],
    tools: [],
    fires: (src) => CLEARANCE_NAME.test(src) && FDM_WORDS.test(src) && !DFM_SPEC_API.test(src),
    message:
      "Print clearance is typed but never checked: declare dfmSpec({ process: 'fdm', minClearance, minWall, printer }) (cookbook fdm-fit-clearance-by-fit-type).",
  },
  {
    code: 'authoring.prefer-api.typed-trace',
    cookbookIds: ['resolve-photo-trace-assumptions'],
    apis: [],
    tools: ['trace_from_image', 'resolve_assumptions'],
    fires: (src) => !TRACE_TOOLS.test(src) && typedPointCount(src) >= TYPED_TRACE_MIN,
    message:
      'Outline has 40+ hand-typed points: trace it with MCP trace_from_image, then resolve_assumptions for scale (cookbook resolve-photo-trace-assumptions).',
  },
];

/**
 * Lint a script source for manufacturing intent built by hand. Returns 0..6
 * `info` diagnostics, at most one per rule. Never throws.
 */
export function lintAuthoringIntent(src: string | undefined): CompilerDiagnostic[] {
  if (src === undefined || src.length === 0) return [];
  const out: CompilerDiagnostic[] = [];
  for (const rule of INTENT_LINT_RULES) {
    let fired = false;
    try {
      fired = rule.fires(src);
    } catch {
      fired = false;
    }
    if (!fired) continue;
    out.push({
      target: 'export-occt',
      code: rule.code,
      severity: 'info',
      message: rule.message,
      hint: DIAGNOSTIC_REGISTRY[rule.code].hintTemplate,
      nextAction: NEXT_ACTIONS[rule.code],
    });
  }
  return out;
}

// ------------------------------------------------- hole-by-cylinder scan --

/**
 * Weighted count of subtract sites whose tool is a cylinder. A direct site
 * counts its cylinder calls; a site whose tool comes from a loop / map, or
 * which itself sits in a loop, counts as many holes (HOLE_BY_CYLINDER_MIN).
 * Follows `const name = ...` / `function name` bindings up to 3 levels deep.
 */
export function cylinderSubtractCount(src: string): number {
  const bindings = collectBindings(src);
  let total = 0;
  for (const site of findCalls(src, 'subtract')) {
    const w = cylinderWeight(site.args, bindings, 0, new Set());
    if (w === 0) continue;
    total += enclosedByLoop(src, site.start) ? Math.max(w, HOLE_BY_CYLINDER_MIN) : w;
  }
  return total;
}

function cylinderWeight(
  expr: string,
  bindings: ReadonlyMap<string, string>,
  depth: number,
  seen: Set<string>,
): number {
  let w = (expr.match(CYLINDER_TOOL) ?? []).length;
  if (depth < 3) {
    for (const name of new Set(expr.match(/\b[A-Za-z_$][\w$]*\b/g) ?? [])) {
      const init = bindings.get(name);
      if (init === undefined || seen.has(name)) continue;
      seen.add(name);
      w += cylinderWeight(init, bindings, depth + 1, seen);
    }
  }
  if (w > 0 && LOOP_TEXT.test(expr)) w = Math.max(w, HOLE_BY_CYLINDER_MIN);
  return w;
}

/** `const|let|var name = <expr>` and `function name(...) {...}` → source text. */
function collectBindings(src: string): Map<string, string> {
  const out = new Map<string, string>();
  const decl = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;\n]+)?=(?!=)/g;
  for (const m of src.matchAll(decl)) {
    const start = m.index + m[0].length;
    const prev = out.get(m[1]);
    const text = readUntilStatementEnd(src, start);
    out.set(m[1], prev === undefined ? text : `${prev}\n${text}`);
  }
  const fn = /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g;
  for (const m of src.matchAll(fn)) {
    const open = src.indexOf('{', m.index + m[0].length);
    if (open < 0) continue;
    const close = matchClose(src, open);
    out.set(m[1], src.slice(open, close));
  }
  return out;
}

/** Calls `.name(` with their balanced argument text. */
function findCalls(src: string, name: string): Array<{ start: number; args: string }> {
  const out: Array<{ start: number; args: string }> = [];
  const re = new RegExp(String.raw`\.\s*${name}\s*\(`, 'g');
  for (const m of src.matchAll(re)) {
    const open = m.index + m[0].length - 1;
    const close = matchClose(src, open);
    out.push({ start: m.index, args: src.slice(open + 1, close) });
  }
  return out;
}

const OPEN = '([{';
const CLOSE = ')]}';

/** Index of the bracket that closes the one at `open` (or src.length). */
function matchClose(src: string, open: number): number {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (OPEN.includes(c)) depth++;
    else if (CLOSE.includes(c)) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return src.length;
}

function readUntilStatementEnd(src: string, start: number): string {
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (OPEN.includes(c)) depth++;
    else if (CLOSE.includes(c)) {
      if (depth === 0) return src.slice(start, i);
      depth--;
    } else if (c === ';' && depth === 0) return src.slice(start, i);
  }
  return src.slice(start);
}

/** True when one of the 3 nearest enclosing brackets of `idx` opens a loop body. */
function enclosedByLoop(src: string, idx: number): boolean {
  let depth = 0;
  let levels = 0;
  for (let i = idx - 1; i >= 0 && levels < 3; i--) {
    const c = src[i];
    if (CLOSE.includes(c)) depth++;
    else if (OPEN.includes(c)) {
      if (depth > 0) {
        depth--;
        continue;
      }
      levels++;
      const before = src.slice(Math.max(0, i - 200), i + 1);
      if (/\b(?:for|while)\s*\([^{}]*\)\s*\{$/.test(before)) return true;
      if (/\.(?:map|flatMap|forEach|reduce)\s*\($/.test(before)) return true;
    }
  }
  return false;
}

// ------------------------------------------------------ typed-trace scan --

/** Longest run of literal 2-D points, or the count of literal `.lineTo(x, y)` calls. */
export function typedPointCount(src: string): number {
  let best = 0;
  let run = 0;
  let lastEnd = -1;
  for (const m of src.matchAll(PAIR)) {
    const contiguous = lastEnd >= 0 && PAIR_GAP.test(src.slice(lastEnd, m.index));
    run = contiguous ? run + 1 : 1;
    lastEnd = m.index + m[0].length;
    if (run > best) best = run;
  }
  const lineTos = (src.match(LINE_TO_LITERAL) ?? []).length;
  return Math.max(best, lineTos);
}
