// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

/**
 * One short line for a person using Studio.
 * Ordinary sentences pass through. Kernel banners and class-name lectures do not.
 */

const DID_NOT_BUILD = 'This shape did not build.';

/** Known lectures, matched on the first line. The replacement is the whole line. */
const FRIENDLY: ReadonlyArray<readonly [RegExp, string]> = [
  [/^OCCT rejected the operation\b/i, 'Try a smaller radius, a thinner wall, or a smaller profile.'],
  [/^An exception was raised during lowering\b/, DID_NOT_BUILD],
  [/^OCCT blend solver rejects\b/i, 'That radius is longer than half the edge. Use a smaller one.'],
  [/^nurbsCurve closed=true but first and last\b/, 'The first and last points differ. Match them, or turn closed off.'],
  [/^A loft rail does not pass near every section\b/, 'Each rail must come within 1 mm of every section. Two rails at most.'],
  [/^loft rails:/i, 'A loft takes two rails at most.'],
  [/^Open3d's is_watertight\b/i, 'The mesh crosses itself on a cone. Raise the mesh deflection.'],
  [/^The exported mesh has non-manifold edges\b/, 'The mesh has open edges. Raise the mesh deflection.'],
  [/^Extend the parent body geometry so its OCCT solid\b/, 'The joint sits off the part. Lengthen the boss, or move the connector onto it.'],
];

const CLASS_TOKEN =
  /\b(?:BRep[A-Za-z0-9_]*|Geom(?:2d)?_[A-Za-z0-9_]+|TopoDS_[A-Za-z0-9_]+|ChFi3d_[A-Za-z0-9_]+|Handle_[A-Za-z0-9_]+|MakePipeShell|nurbsSurfaceLowerer|StdFail_[A-Za-z0-9_]+)\b/g;

const ADVICE_START = /^(try|use|check|verify|move|translate|reduce|pick|shorten|add|drop|match|lengthen)\b/i;

function firstLine(text: string): string {
  return text.split('\n').map((part) => part.trim()).find(Boolean) ?? '';
}

function capitalize(line: string): string {
  return /[a-z]/.test(line.charAt(0)) ? line.charAt(0).toUpperCase() + line.slice(1) : line;
}

function cap(line: string, max: number): string {
  if (line.length <= max) return line;
  const cut = line.slice(0, Math.max(1, max - 1));
  const space = cut.lastIndexOf(' ');
  const kept = (space > 40 ? cut.slice(0, space) : cut).trimEnd();
  return `${kept}…`;
}

/** The clause after an em dash, when it is the thing to do. */
function advice(line: string): string | null {
  const parts = line.split(/\s+[—–]\s+/);
  const last = parts.at(-1);
  if (!last || parts.length < 2 || !ADVICE_START.test(last)) return null;
  const sentence = last.split('(')[0]?.trim().replace(/[.;,\s]+$/, '') ?? '';
  if (sentence.length < 8) return null;
  const done = /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
  return capitalize(done);
}

function tidy(line: string): string {
  const cleaned = line
    .replace(CLASS_TOKEN, '')
    .replace(/\b(?:OCCT(?:'s)?|OpenCascade|Open CASCADE)\b/g, '')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/\(\s*\)/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
    .replace(/^[\s:;,—–-]+/, '')
    .replace(/[\s:;,—–-]+$/, '');
  if (!cleaned || /\b(?:because|whose|and|the)\s+(?:emits|accepts)\b/i.test(cleaned)) return '';
  const sentences = cleaned.split(/(?<=[.!;])\s+/).filter((sentence) => !/\(\s*\)/.test(sentence) && !/\bbinding is available\b/i.test(sentence));
  return sentences.join(' ').trim();
}

/** Shorten `text` for a label. Pass `max` for a tight spot such as the status bar. */
export function plainLine(text: string, max = 140): string {
  const raw = firstLine(text);
  if (!raw || /^\d+$/.test(raw) || /^OpenCascade Error\b/i.test(raw)) return DID_NOT_BUILD;

  for (const [pattern, friendly] of FRIENDLY) {
    if (pattern.test(raw)) return cap(friendly, max);
  }

  const dashed = advice(raw);
  if (dashed) return cap(dashed, max);

  const failed = raw.match(/^OCCT\s+(.+?)\s+failed\b/i);
  if (failed?.[1]) return cap(`${capitalize(failed[1])} failed.`, max);

  let line = tidy(raw);
  if (!line) return DID_NOT_BUILD;
  if (/^(?:OCCT|OpenCascade|Open CASCADE)\b/i.test(raw)) line = capitalize(line);
  line = line.replace(/\bfailed:\s*$/i, 'failed.');
  return cap(line, max);
}
