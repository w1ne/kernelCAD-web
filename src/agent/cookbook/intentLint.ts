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
// fails an evaluation. Comments count: agents write their intent there. But a
// comment sentence that negates its own mention ("NOT a swept V-thread",
// "teeth not modelled") is dropped first.
//
// Each rule also needs an actionable target: something in the CODE (comments
// stripped) that the named API would replace. A word with nothing to convert
// is a hint the agent "fixes" by changing the wrong thing, then retries.

import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { DIAGNOSTIC_REGISTRY, NEXT_ACTIONS, type DiagnosticCode } from '../../shared/diagnostics/registry';

/** One script, read three ways. */
export interface IntentLintSource {
  /** The script as given. */
  src: string;
  /** Code only: comments blanked, strings kept. Structure checks read this. */
  code: string;
  /** Code plus every comment sentence that does not negate itself. Word checks read this. */
  prose: string;
}

export interface IntentLintRule {
  code: DiagnosticCode;
  /** Cookbook snippet ids the message names. Tested to exist. */
  cookbookIds: readonly string[];
  /** Script API calls the message names. Tested to exist. */
  apis: readonly string[];
  /** MCP tools the message names. Tested to exist. */
  tools: readonly string[];
  /** Intent words in the prose AND an actionable target in the code. */
  fires(s: IntentLintSource): boolean;
  message: string;
}

// ---------------------------------------------------------------- matchers --

/** Shape method call `.hole(` / `.holes(` — a user helper named `hole(` is not the API. */
const HOLE_CALL = /\.\s*holes?\s*\(/;
const THREAD_OPTION = /\bthread\s*:/;
/** "threaded through" is a chain or cord, not a fastener. */
const THREAD_WORDS = /\bthread(?:s|ed)?\b(?!\s+through\b)|\btapped\b|\btap[- ]?drill\b|\btapping\b/i;
const METRIC_SIZE = /\bM(?:2|2\.5|3|4|5|6|8|10|12)\b/;
const INSERT_WORDS = /\bheat[- ]?set\b|\b(?:threaded|brass|knurled|M\d(?:\.\d)?)\s+inserts?\b/i;
/** Purchased fasteners from the parts library carry their own thread. */
const LIB_PART = /\blib\.\w+/;
/** Radius band of a cut an M2–M12 fastener goes into: M2 tap drill (r 0.8)
 *  to an M12 coarse clearance hole (r 7.25) or a large heat-set pilot. */
const FASTENER_R_MIN = 0.7;
const FASTENER_R_MAX = 7.5;

const GEAR_API = /\b(?:spurGear|ringGear|internalSpurGear|internalGear)\s*\(/;
const GEAR_WORDS = /\bgears?\b|\binvolute\b|\bgear[- ]?module\b|\bmodule(?:Mm)?\s*[:=]\s*\d/i;
const TEETH = /\bteeth\b/i;
/** Pulleys, combs, saws and knurls have teeth too; spurGear is not their API. */
const NON_GEAR_TEETH = /\bpulleys?\b|\bbelts?\b|\bgt2\b|\bhtd\b|\btiming\b|\bcombs?\b|\bsaws?\b|\bzip|\bknurl/i;
/** Ops that add one more copy of geometry per loop pass. */
const GEOMETRY_OP = /\.\s*(?:union|subtract|lineTo|arcTo|splineTo|bezierTo|threePointArcTo)\s*\(|\.\s*push\s*\(/;
const PATTERN_CALL = /\.\s*pattern(?:Circular|Linear|Grid)\s*\(/;

const SHEET_METAL_API = /\bsheetMetal\s*\(/;
const SHEET_METAL_WORDS = /\bsheet[- ]?metal\b|\bflat[- ]?pattern\b|\bk[- ]?factor\b/i;
const BEND_WORDS = /\bbend(?:s|ing)?\b|\bbent\b/i;
/** Pipes, tubes, wires, swept paths and combs bend too; sheetMetal is not their API. */
const NON_SHEET_BEND = /\bpipes?\b|\btubes?\b|\btubing\b|\bwires?\b|\bcables?\b|\bsweep|\bhoses?\b|\brods?\b|\bcombs?\b/i;
/** Sheet stock: at most 6 mm, and at most a quarter of the next dimension. */
const SHEET_MAX_T = 6;
const SHEET_ASPECT = 0.25;

const DFM_SPEC_API = /\bdfmSpec\s*\(/;
const CLEARANCE_DECL = /\b(?:const|let|var)\s+(\w*(?:clearance|fit|gap|tolerance)\w*)\s*(?::[^=;\n]+)?=(?!=)/gi;
const FDM_WORDS = /\bprint(?:s|ed|ing|able)?\b|\bfdm\b|\bpla\b|\bpetg\b|\bbambu\b|\bprusa\b/i;
/** A second process named: the clearance is not (only) a print clearance, and dfmSpec is FDM-only. */
const NON_FDM_PROCESS =
  /\blaser(?:[- ]?cut)?\b|\bcnc\b|\brouter\b|\bmachin(?:ed|ing)\b|\bmill(?:ed|ing)\b|\bwater[- ]?jet\b|\binjection[- ]mou?lded\b/i;
const MATERIAL_DECL = /\bmaterial\s*:\s*['"`]([\w.+-]+)['"`]/g;
const PRINTABLE_MATERIAL = /pla|petg|abs|asa|tpu|nylon|\bpa\d*\b|\bpc\b|pei|resin|cf\b/i;

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

/**
 * A comment sentence that says the thing is NOT built. Common phrasings
 * only — this is a filter for honest disclaimers, not a parser.
 */
const NEGATED =
  /\bnot\s+(?:a\s+|an\s+)?(?:real|true|actual|swept|modell?ed|cut|tapped|threaded)\b|\bno\s+(?:real\s+|actual\s+)?(?:threads?|threading|gears?|teeth|bends?|sheet[- ]?metal|inserts?)\b|\b(?:does|do|did)\s*(?:not|n't)\s+model\b|\bschematic\s+only\b|\breference\s+only\b/i;

// ------------------------------------------------------------- the rules --

export const INTENT_LINT_RULES: readonly IntentLintRule[] = [
  {
    code: 'authoring.prefer-api.thread',
    cookbookIds: ['threaded-hole-tap-drill', 'heat-set-insert-pilot'],
    apis: ['hole'],
    tools: [],
    // Target: a fastener-sized subtracted cylinder, or a hole() with no thread.
    fires: ({ code, prose }) => {
      const hasHole = HOLE_CALL.test(code);
      const fastenerCut = cutsFastenerCylinder(code);
      const threadWords =
        THREAD_WORDS.test(prose) && !(hasHole && THREAD_OPTION.test(code)) && !LIB_PART.test(code);
      const sizeWords = (METRIC_SIZE.test(prose) || INSERT_WORDS.test(prose)) && !hasHole;
      return (threadWords && (hasHole || fastenerCut)) || (sizeWords && fastenerCut);
    },
    message:
      'Script names a thread / M-size / insert but no hole() carries it: use hole(face, { diameter, thread: { pitch } }) (cookbook threaded-hole-tap-drill; inserts: heat-set-insert-pilot).',
  },
  {
    code: 'authoring.prefer-api.hole-by-cylinder',
    cookbookIds: ['clearance-hole-through-plate'],
    apis: ['holes'],
    tools: [],
    // Target: the subtracted cylinders themselves.
    fires: ({ src }) => !HOLE_CALL.test(src) && cylinderSubtractCount(src) >= HOLE_BY_CYLINDER_MIN,
    message:
      'Holes are cut by subtracting cylinders: use holes(face, { positions, diameter, depth }) so export, drawings and DFM see real hole features (cookbook clearance-hole-through-plate).',
  },
  {
    code: 'authoring.prefer-api.gear',
    cookbookIds: ['involute-spur-gear-pair'],
    apis: ['spurGear', 'ringGear'],
    tools: [],
    // Target: a loop or pattern that builds repeated geometry (the teeth).
    fires: ({ code, prose }) =>
      (GEAR_WORDS.test(prose) || (TEETH.test(prose) && !NON_GEAR_TEETH.test(prose))) &&
      !GEAR_API.test(code) &&
      buildsRepeatedGeometry(code),
    message:
      'Script names gears but builds the teeth by hand: use spurGear({ module, teeth, faceWidth, backlash }), ringGear() for internal teeth (cookbook involute-spur-gear-pair).',
  },
  {
    code: 'authoring.prefer-api.sheet-metal',
    cookbookIds: ['sheet-metal-l-bracket-bend'],
    apis: ['sheetMetal', 'bend'],
    tools: ['flatten_pattern'],
    // Target: two plate-like boxes joined, or a thin extrude.
    fires: ({ code, prose }) =>
      (SHEET_METAL_WORDS.test(prose) || (BEND_WORDS.test(prose) && !NON_SHEET_BEND.test(prose))) &&
      !SHEET_METAL_API.test(code) &&
      buildsSheetStock(code),
    message:
      'Script names sheet metal / bends but fakes them with solids: use sheetMetal(profile, { thickness, kFactor }).bend(...) and MCP flatten_pattern (cookbook sheet-metal-l-bracket-bend).',
  },
  {
    code: 'authoring.prefer-api.fdm-clearance',
    cookbookIds: ['fdm-fit-clearance-by-fit-type'],
    apis: ['dfmSpec'],
    tools: [],
    // Target: a clearance binding the geometry actually uses, in a print-only script.
    fires: ({ code, prose }) =>
      FDM_WORDS.test(prose) &&
      !NON_FDM_PROCESS.test(prose) &&
      !DFM_SPEC_API.test(code) &&
      !namesOnlyNonPrintableMaterials(code) &&
      usesClearanceBinding(code),
    message:
      "Print clearance is typed but never checked: declare dfmSpec({ process: 'fdm', minClearance, minWall, printer }) (cookbook fdm-fit-clearance-by-fit-type).",
  },
  {
    code: 'authoring.prefer-api.typed-trace',
    cookbookIds: ['resolve-photo-trace-assumptions'],
    apis: [],
    tools: ['trace_from_image', 'resolve_assumptions'],
    // Target: the typed point list itself.
    fires: ({ src }) => !TRACE_TOOLS.test(src) && typedPointCount(src) >= TYPED_TRACE_MIN,
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
  let source: IntentLintSource;
  try {
    source = readSource(src);
  } catch {
    return [];
  }
  const out: CompilerDiagnostic[] = [];
  for (const rule of INTENT_LINT_RULES) {
    let fired = false;
    try {
      fired = rule.fires(source);
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

// ------------------------------------------------------- source reading --

/** Split comments from code; keep the comment sentences that do not negate themselves. */
export function readSource(src: string): IntentLintSource {
  const code: string[] = [];
  const comments: Array<{ start: number; end: number; text: string }> = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    if (c === '/' && next === '/') {
      const end = src.indexOf('\n', i);
      const stop = end < 0 ? src.length : end;
      comments.push({ start: i, end: stop, text: src.slice(i + 2, stop) });
      code.push(' ');
      i = stop;
    } else if (c === '/' && next === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end < 0 ? src.length : end + 2;
      comments.push({ start: i, end: stop, text: src.slice(i + 2, end < 0 ? src.length : end).replace(/^\s*\*/gm, ' ') });
      code.push(' ');
      i = stop;
    } else if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < src.length && src[j] !== c && !(c !== '`' && src[j] === '\n')) j += src[j] === '\\' ? 2 : 1;
      // A palette token (`.color('gear')`) names a colour, not intent.
      const palette = /\.\s*color\s*\(\s*$/.test(code.slice(-16).join(''));
      code.push(palette ? `${c}${c}` : src.slice(i, j + 1));
      i = j + 1;
    } else {
      code.push(c);
      i++;
    }
  }
  // Consecutive comments (only whitespace between) form one comment: a
  // sentence often runs across `//` lines.
  const blocks: string[] = [];
  let prevEnd = -1;
  for (const cm of comments) {
    if (prevEnd >= 0 && /^\s*$/.test(src.slice(prevEnd, cm.start))) blocks[blocks.length - 1] += ` ${cm.text}`;
    else blocks.push(cm.text);
    prevEnd = cm.end;
  }
  const kept = blocks
    .flatMap((b) => b.split(/(?<=[.!?;])\s+/))
    .filter((sentence) => !NEGATED.test(sentence));
  const codeText = code.join('');
  return { src, code: codeText, prose: `${codeText}\n${kept.join('\n')}` };
}

// ------------------------------------------------- actionable targets --

/** True when some subtract cuts a cylinder whose radius is fastener-sized or unknown. */
export function cutsFastenerCylinder(code: string): boolean {
  const bindings = collectBindings(code);
  const nums = numericBindings(code, bindings);
  for (const site of findCalls(code, 'subtract')) {
    for (const r of cylinderRadii(site.args, bindings, nums, 0, new Set())) {
      if (r === undefined || (r >= FASTENER_R_MIN && r <= FASTENER_R_MAX)) return true;
    }
  }
  return false;
}

/** Radius of every cylinder / extrudeCircle in `expr`, following bindings. */
function cylinderRadii(
  expr: string,
  bindings: ReadonlyMap<string, string>,
  nums: ReadonlyMap<string, number>,
  depth: number,
  seen: Set<string>,
): Array<number | undefined> {
  const out: Array<number | undefined> = [];
  for (const m of expr.matchAll(/\b(cylinder|extrudeCircle|circle)\s*\(/g)) {
    const open = m.index + m[0].length - 1;
    const args = splitArgs(expr.slice(open + 1, matchClose(expr, open)));
    const arg = m[1] === 'cylinder' ? args[1] : m[1] === 'extrudeCircle' ? args[0] : args[args.length - 1];
    out.push(arg === undefined ? undefined : resolveNumber(arg, nums));
  }
  if (depth < 3) {
    for (const name of new Set(expr.match(/\b[A-Za-z_$][\w$]*\b/g) ?? [])) {
      const init = bindings.get(name);
      if (init === undefined || seen.has(name)) continue;
      seen.add(name);
      out.push(...cylinderRadii(init, bindings, nums, depth + 1, seen));
    }
  }
  return out;
}

/** A loop that adds geometry each pass, or a pattern call. */
export function buildsRepeatedGeometry(code: string): boolean {
  if (PATTERN_CALL.test(code)) return true;
  return loopBodies(code).some((body) => GEOMETRY_OP.test(body));
}

/** Header + body text of every for / while loop and every map / forEach / reduce / Array.from callback. */
function loopBodies(code: string): string[] {
  const out: string[] = [];
  for (const m of code.matchAll(/\b(?:for|while)\s*\(/g)) {
    const open = m.index + m[0].length - 1;
    const close = matchClose(code, open);
    let k = close + 1;
    while (k < code.length && /\s/.test(code[k])) k++;
    const bodyEnd = code[k] === '{' ? matchClose(code, k) + 1 : statementEnd(code, k);
    out.push(code.slice(m.index, bodyEnd));
  }
  for (const m of code.matchAll(/\.(?:map|flatMap|forEach|reduce)\s*\(|\bArray\.from\s*\(/g)) {
    const open = m.index + m[0].length - 1;
    out.push(code.slice(open, matchClose(code, open) + 1));
  }
  return out;
}

/** Two plate-like boxes joined by a union, or a thin extrude. */
export function buildsSheetStock(code: string): boolean {
  const nums = numericBindings(code, collectBindings(code));
  const isSheet = (dims: Array<number | undefined>): boolean => {
    if (dims.some((d) => d === undefined)) return false;
    const [a, b] = (dims as number[]).map(Math.abs).sort((x, y) => x - y);
    return a > 0 && a <= SHEET_MAX_T && a <= SHEET_ASPECT * b;
  };
  let plates = 0;
  for (const m of code.matchAll(/\bbox\s*\(/g)) {
    const open = m.index + m[0].length - 1;
    const args = splitArgs(code.slice(open + 1, matchClose(code, open)));
    if (args.length >= 3 && isSheet(args.slice(0, 3).map((a) => resolveNumber(a, nums)))) plates++;
  }
  if (plates >= 2 && /\.\s*union\s*\(/.test(code)) return true;
  for (const m of code.matchAll(/\.\s*extrude\s*\(|\bextrudeRect\s*\(/g)) {
    const open = m.index + m[0].length - 1;
    const args = splitArgs(code.slice(open + 1, matchClose(code, open)));
    const depthArg = m[0].includes('extrudeRect') ? args[2] : args[0];
    const d = depthArg === undefined ? undefined : resolveNumber(depthArg, nums);
    if (d !== undefined && d > 0 && d <= SHEET_MAX_T) return true;
  }
  return false;
}

/** A clearance / fit / gap / tolerance binding referenced again after its declaration. */
export function usesClearanceBinding(code: string): boolean {
  for (const m of code.matchAll(CLEARANCE_DECL)) {
    const uses = code.match(new RegExp(String.raw`(?<![\w$.])${m[1]}\b`, 'g')) ?? [];
    if (uses.length >= 2) return true;
  }
  return false;
}

/** The script names part materials and none of them prints. */
function namesOnlyNonPrintableMaterials(code: string): boolean {
  const materials = [...code.matchAll(MATERIAL_DECL)].map((m) => m[1]);
  return materials.length > 0 && !materials.some((m) => PRINTABLE_MATERIAL.test(m));
}

// ------------------------------------------------------ number resolving --

/** `const x = <number expr>` and `const x = param('x', N ...)` → value. */
function numericBindings(code: string, bindings: ReadonlyMap<string, string>): Map<string, number> {
  const out = new Map<string, number>();
  for (const [name, init] of bindings) {
    if (init.includes('\n')) continue; // re-bound: no single value
    const v = resolveNumber(init, out);
    if (v !== undefined) out.set(name, v);
  }
  return out;
}

/** Value of a numeric expression over known names, or undefined. */
export function resolveNumber(expr: string, nums: ReadonlyMap<string, number>): number | undefined {
  const text = expr.trim();
  const p = /^param\s*\(\s*['"`][^'"`]*['"`]\s*,\s*([^,)]+)/.exec(text);
  if (p) return resolveNumber(p[1], nums);
  const sub = text
    .replace(/\bMath\.PI\b/g, String(Math.PI))
    .replace(/\b[A-Za-z_$][\w$]*\b/g, (name) => (nums.has(name) ? `(${nums.get(name)})` : name));
  if (!/^[\d\s.+\-*/()]+$/.test(sub)) return undefined;
  const v = evalArithmetic(sub);
  return v !== undefined && Number.isFinite(v) ? v : undefined;
}

/** + - * / and parentheses over number literals. No eval. */
function evalArithmetic(text: string): number | undefined {
  const tokens = text.match(/\d+\.?\d*|\.\d+|[-+*/()]/g) ?? [];
  let pos = 0;
  const peek = (): string | undefined => tokens[pos];
  const factor = (): number => {
    const t = tokens[pos++];
    if (t === '-') return -factor();
    if (t === '+') return factor();
    if (t === '(') {
      const v = sum();
      if (tokens[pos++] !== ')') throw new Error('paren');
      return v;
    }
    const v = Number(t);
    if (t === undefined || Number.isNaN(v)) throw new Error('num');
    return v;
  };
  const product = (): number => {
    let v = factor();
    while (peek() === '*' || peek() === '/') v = tokens[pos++] === '*' ? v * factor() : v / factor();
    return v;
  };
  const sum = (): number => {
    let v = product();
    while (peek() === '+' || peek() === '-') v = tokens[pos++] === '+' ? v + product() : v - product();
    return v;
  };
  try {
    const v = sum();
    return pos === tokens.length ? v : undefined;
  } catch {
    return undefined;
  }
}

/** Top-level comma split of an argument list. */
function splitArgs(args: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < args.length; i++) {
    const c = args[i];
    if (OPEN.includes(c)) depth++;
    else if (CLOSE.includes(c)) depth--;
    else if (c === ',' && depth === 0) {
      out.push(args.slice(from, i));
      from = i + 1;
    }
  }
  if (args.slice(from).trim().length > 0) out.push(args.slice(from));
  return out;
}

/** End of a brace-less loop body statement. */
function statementEnd(src: string, start: number): number {
  return start + readUntilStatementEnd(src, start).length + 1;
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
