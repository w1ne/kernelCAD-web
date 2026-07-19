// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/fromVectorFormats.ts
//
// Host-side loaders for the two 2D import formats: `lib.fromDXF(path, opts?)`
// and `lib.fromSVG(path, opts?)`.
//
// Same shape as `fromMeshFormats.ts` and deliberately so: read the file on
// the host at capture time, decode, and register the result. The difference
// is what gets registered — a DXF or SVG carries a 2D PROFILE, not a body, so
// these produce `Sketch` records (`kind: 'sketch'`, `metadata.commands`)
// identical to what `path().moveTo(...).close()` produces. There is no
// imported-geometry side channel and no new lowering path: an imported
// profile IS a sketch, so `.extrude()`, `.revolve()`, `.sweep()` and
// `.loft()` all work on it with no special casing anywhere downstream.
//
// WHY BOTH RETURN AN ARRAY
// ------------------------
// A 2D drawing routinely holds more than one closed region — an outline plus
// its bolt-hole circles, a nest of parts on one sheet. There is no way to
// tell a hole from a separate part from the geometry alone (both are just a
// loop inside another loop; whether it is a pocket, a through-hole or a
// second part is intent the file does not record). So both calls ALWAYS
// return `Sketch[]`, ordered by descending enclosed area — index 0 is the
// outermost profile — and the caller states the intent:
//
//     const [outline, ...holes] = await lib.fromDXF('bracket.dxf');
//     let plate = outline.extrude(3);
//     for (const h of holes) plate = plate.cut(h.extrude(3));
//
// A single-region file returns a one-element array. Returning `Sketch |
// Sketch[]` depending on the file would make every call site a type test and
// would silently change shape when someone adds a hole to the drawing.

import { readFile } from 'node:fs/promises';
import { resolveScriptRelativePath } from '../../shared/runtime/scriptRelativePath';
import { importDxfText, DxfParseError, type ImportDxfOptions } from '../../kernel/import/importDxf';
import { importSvgText, SvgParseError, type ImportSvgOptions } from '../../kernel/import/importSvg';
import type { ImportedRegion } from '../../kernel/import/contourAssembly';
import { Sketch } from '../capture/sketch';
import { KernelError } from '../../shared/intent/kernelError';
import type { FromSTEPContext } from './fromSTEP';

/** Shared context shape with `lib.fromSTEP`. */
export type FromVectorContext = FromSTEPContext;

export type FromDXFOptions = ImportDxfOptions;
export type FromSVGOptions = ImportSvgOptions;

function requirePath(path: string, fn: 'fromDXF' | 'fromSVG', ext: string): void {
  if (typeof path !== 'string' || path.length === 0) {
    throw new KernelError(
      'feature.invalid-args',
      `lib.${fn}(path): path must be a non-empty string.`,
      undefined,
      `invalid-args.lib.${fn} — pass a relative or absolute path to a ${ext} file (e.g. lib.${fn}('profiles/plate${ext}')).`,
    );
  }
}

async function readTextOrThrow(
  absPath: string,
  path: string,
  fn: 'fromDXF' | 'fromSVG',
): Promise<string> {
  try {
    return await readFile(absPath, 'utf8');
  } catch {
    throw new KernelError(
      'feature.invalid-args',
      `lib.${fn}: cannot read file at ${absPath}.`,
      undefined,
      `invalid-args.lib.${fn}.path — verify the path '${path}' resolves under the script's directory; absolute paths are also accepted.`,
    );
  }
}

/**
 * Register one region as a sketch FeatureRecord.
 *
 * The provenance fields are plain scalars on purpose — the ParamRef metadata
 * walker traverses this object, and they exist so `inspect` can answer "where
 * did this profile come from, and what unit was assumed" without re-reading
 * the file.
 */
function registerRegions(
  ctx: FromVectorContext,
  regions: readonly ImportedRegion[],
  provenance: Record<string, string | number | boolean>,
): Sketch[] {
  return regions.map((region, index) =>
    ctx.session.createSketch({
      kind: 'sketch',
      inputs: {},
      params: {},
      metadata: {
        commands: region.commands,
        ...provenance,
        regionIndex: index,
        regionCount: regions.length,
        regionAreaMm2: region.areaMm2,
        regionSource: region.source,
      },
    }),
  );
}

/**
 * `lib.fromDXF(path, opts?)` — import a 2D DXF drawing as closed sketches.
 *
 * Reads LINE, ARC, CIRCLE, LWPOLYLINE and POLYLINE. Arcs survive exactly:
 * DXF's bulge factor is the same number `bulgeArc` already carries. SPLINE,
 * ELLIPSE and INSERT are REFUSED with a diagnostic naming the entity and its
 * line number, because each of them carries profile geometry that would
 * otherwise vanish from the result without a trace.
 *
 * UNITS: `$INSUNITS` decides the scale. When it is absent or 0 (Unitless) the
 * coordinates are taken as millimetres — reported on the sketch metadata as
 * `unitSource`, and overridable with `opts.units`.
 *
 * Returns `Sketch[]`, largest region first. See the module header.
 */
export async function fromDXF(
  ctx: FromVectorContext,
  path: string,
  opts: FromDXFOptions = {},
): Promise<Sketch[]> {
  requirePath(path, 'fromDXF', '.dxf');
  const absPath = resolveScriptRelativePath(ctx.scriptDir, path);
  const text = await readTextOrThrow(absPath, path, 'fromDXF');

  let result: ReturnType<typeof importDxfText>;
  try {
    result = importDxfText(text, opts);
  } catch (e) {
    if (e instanceof DxfParseError) {
      throw new KernelError(
        'feature.kernel-failed',
        `lib.fromDXF: ${absPath} — ${e.message}`,
        undefined,
        `kernel-failed.lib.fromDXF.${e.reason} — ${DXF_HINTS[e.reason]}`,
      );
    }
    const msg = e instanceof Error ? e.message : String(e);
    throw new KernelError(
      'feature.kernel-failed',
      `lib.fromDXF: could not read DXF at ${absPath}: ${msg}`,
      undefined,
      'kernel-failed.lib.fromDXF.parse — file is not a readable ASCII DXF.',
    );
  }

  return registerRegions(ctx, result.regions, {
    sourcePath: absPath,
    sourceFormat: 'dxf',
    unitScale: result.unitScale,
    unitSource: result.unitSource,
    ignoredEntityCount: result.ignoredEntities.length,
    duplicateSegmentsDropped: result.duplicatesDropped,
    gapsClosed: result.gapsClosed,
  });
}

const DXF_HINTS: Record<string, string> = {
  empty: 'the file is empty.',
  'not-dxf': 'the file is not group-code/value DXF text (binary DXF is not supported — re-export as ASCII DXF).',
  'no-entities': 'the file has no ENTITIES section, so it contains no drawable geometry.',
  'unsupported-entity': 'convert the named entity to lines, arcs or polylines in the source tool and re-export; kernelCAD refuses rather than dropping it, because a dropped entity leaves an invisible hole in the profile.',
  'malformed-entity': 'the named entity is missing a required group code or carries a non-numeric value; the file is corrupt or truncated.',
  'bad-units': 'state the intended unit with { units: "mm" | "in" | ... }.',
  contour: 'the drawing does not resolve into closed regions — close the contour in the source tool, or raise { tolerance } if the gap is only a rounding artefact.',
};

/**
 * `lib.fromSVG(path, opts?)` — import an SVG drawing as closed sketches.
 *
 * Reads `<path>` (M/L/H/V/C/S/Q/T/A/Z, absolute and relative), `<rect>`,
 * `<circle>`, `<ellipse>`, `<polygon>`, `<polyline>`, `<line>` and `<g>`
 * nesting with `translate`/`scale`/`rotate`/`matrix` transforms. `<use>`,
 * `<text>` and `<image>` are REFUSED — they reference geometry this importer
 * will not silently omit.
 *
 * Y AXIS: SVG's Y points down, kernelCAD's points up. Every point is
 * reflected about the top of the `viewBox` (or the `height` when there is no
 * viewBox), so the drawing lands upright in positive Y.
 *
 * UNITS: `viewBox` plus a physically-dimensioned `width` (e.g.
 * `width="120mm"`) gives the true scale. Without one, a user unit is one CSS
 * pixel (1/96 in), per the SVG spec. Either way the decision is recorded in
 * the sketch metadata as `unitSource` and can be overridden with
 * `opts.units`.
 *
 * Béziers and true ellipses have no exact form in the sketch command set and
 * are subdivided into chords within `opts.curveTolerance` mm (default 0.01);
 * lines and circular arcs are exact.
 *
 * Returns `Sketch[]`, largest region first. See the module header.
 */
export async function fromSVG(
  ctx: FromVectorContext,
  path: string,
  opts: FromSVGOptions = {},
): Promise<Sketch[]> {
  requirePath(path, 'fromSVG', '.svg');
  const absPath = resolveScriptRelativePath(ctx.scriptDir, path);
  const text = await readTextOrThrow(absPath, path, 'fromSVG');

  let result: ReturnType<typeof importSvgText>;
  try {
    result = importSvgText(text, opts);
  } catch (e) {
    if (e instanceof SvgParseError) {
      throw new KernelError(
        'feature.kernel-failed',
        `lib.fromSVG: ${absPath} — ${e.message}`,
        undefined,
        `kernel-failed.lib.fromSVG.${e.reason} — ${SVG_HINTS[e.reason]}`,
      );
    }
    const msg = e instanceof Error ? e.message : String(e);
    throw new KernelError(
      'feature.kernel-failed',
      `lib.fromSVG: could not read SVG at ${absPath}: ${msg}`,
      undefined,
      'kernel-failed.lib.fromSVG.parse — file is not readable SVG text.',
    );
  }

  return registerRegions(ctx, result.regions, {
    sourcePath: absPath,
    sourceFormat: 'svg',
    unitScale: result.unitScale,
    unitSource: result.unitSource,
    flippedAboutViewBox: result.flippedAboutViewBox,
    ignoredElementCount: result.ignoredElements.length,
    duplicateSegmentsDropped: result.duplicatesDropped,
    gapsClosed: result.gapsClosed,
  });
}

const SVG_HINTS: Record<string, string> = {
  empty: 'the file is empty.',
  'not-svg': 'no <svg> root element was found — the file is not SVG.',
  'unsupported-element': 'convert the named element to plain paths in the source tool (Inkscape: Path > Object to Path; Illustrator: Create Outlines / Expand), then re-export.',
  'unsupported-command': 'the path data contains a character that is not an SVG path command; the file is corrupt or was written by a non-conforming tool.',
  'malformed-attribute': 'the named attribute is missing or is not a number; the file is corrupt.',
  'malformed-path': 'the `d` attribute is not valid SVG path data at the reported offset.',
  'bad-units': 'give the <svg> an absolute width (e.g. width="120mm") alongside its viewBox, or state the unit with { units: "mm" | "in" | ... }.',
  contour: 'the drawing does not resolve into closed regions — close the contour in the source tool, or raise { tolerance } if the gap is only a rounding artefact.',
};
