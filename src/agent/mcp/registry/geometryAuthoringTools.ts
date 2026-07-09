// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { addFeatureTool } from '../tools/addFeature';
import { addCurveTool } from '../tools/addCurve';
import { addSurfaceTool } from '../tools/addSurface';
import { addPathSegmentTool } from '../tools/addPathSegment';
import { traceFromImageTool } from '../tools/traceFromImage';
import { addPatternFeatureTool } from '../tools/addPatternFeature';
import { addVariableSweepTool } from '../tools/addVariableSweep';
import { addTextTool } from '../tools/addText';
import { projectCurveTool } from '../tools/projectCurve';
import { removeFeatureTool } from '../tools/removeFeature';
import type { ToolRegistryEntry } from './types';

export const geometryAuthoringToolEntries: ToolRegistryEntry[] = [
  {
    definition: {
      name: 'add_feature',
      description: 'Use this when you need to insert a new feature line into a script. Insert a new feature line into a kernelCAD script before the last top-level return statement. Returns the modified code as text plus diagnostics from re-evaluating the result. Side-effect-free. Primitives that accept faceLabels (box, cylinder, extrudeRect, extrudeCircle, extrudePolygon, extrudeRoundedRect) can receive `opts.faceLabels` in the inserted code — use `lookup_api` to see `featureKindFaceLabels` for the full value schema.',
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The .kcad.ts source code.' },
          feature_code: { type: 'string', description: 'Single-statement source line to insert (e.g. `const hole = cylinder(5, 2).translate(10, 10, -1);`).' },
        },
        required: ['code', 'feature_code'],
      },
    },
    handler: input => addFeatureTool(input as unknown as Parameters<typeof addFeatureTool>[0]),
  },
  {
    definition: {
      name: 'add_surface',
      description:
        'Use this when you need an organic, freeform, or swept shape — a body shell, panel, fairing, ergonomic curve, lens, or sculpted form — authored as a NURBS Surface into the user\'s .kcad.ts, OR when you need to finish surfaces into a watertight solid or taper faces for moldability. One authoring/finishing path, selected by `kind`:\n' +
        "- 'nurbs' — insert a nurbsSurface(...) / surfaceFromCurves(...) call. Pass either { controls, degree, weights?, knots?, periodic? } for direct construction, OR { section_sketch_ids } for skinning. Weights are honored: supply rational weights to build exact circles/cylinders/spheres/conics (the surface becomes rational); omit weights for a non-rational surface.\n" +
        "- 'boundary' — insert a surfaceFromBoundary([c1,c2,c3,c4], opts?) call: one NURBS face through 4 boundary Curve3D refs (bottom, right, top, left in loop order; adjacent endpoints must coincide within 1e-6 mm) via OCCT BRepOffsetAPI_MakeFilling.\n" +
        "- 'trim' — insert a `<surface>.trimTo(<by>)` or `<surface>.split(<by>)` call. Pass `surface_binding` (the Surface variable name), `by_binding` (the cutter Surface variable name; Shape/Curve3D cutters are deferred to a later slice), and `op: 'trim'` (keep the largest imprinted piece) or `op: 'split'` (return both halves as a `[Surface, Surface]` tuple).\n" +
        "- 'sew' — insert a `sew([s0, s1, ...], opts?)` call to stitch N surfaces into a closed watertight solid via OCCT BRepBuilderAPI_Sewing. Pass `surface_bindings` (array of Surface variable names). Use after trim/boundary to close patches into a solid: trim → sew → solid pipeline. Optional `tolerance` (mm, default 1e-6) and `require_closed` (emits feature.surface-sew.open-shell if result is not watertight).\n" +
        "- 'draft' — insert a `<shape>.draft(angleDeg, { face, neutralPlane?, pullDir? })` call to taper the selected face(s) for mold release. Pass `shape_binding`, `angle_deg` (0–90), and `face` (canonical name, label, or FaceQuery descriptor). Lowering emits feature.draft.failed on invalid geometry.\n" +
        'The returned Surface produces no Shape until you chain .thicken(t) or .toShape() (do that via add_feature on the binding name). Returns the modified code + diagnostics. Each kind fails closed on its own missing required params.',
      inputSchema: {
        type: 'object',
        properties: {
          kind: {
            type: 'string',
            enum: ['nurbs', 'boundary', 'trim', 'sew', 'draft'],
            description: "Which surface-construction or surface-finishing path to use: 'nurbs' | 'boundary' | 'trim' | 'sew' | 'draft'.",
          },
          code: { type: 'string', description: 'Current .kcad.ts source.' },
          controls: {
            type: 'array',
            description: "kind:'nurbs' — control-point grid for direct construction (controls[u][v] = [x, y, z], mm).",
            items: {
              type: 'array',
              items: { type: 'array', items: { type: 'number' } },
            },
          },
          weights: {
            type: 'array',
            description: "kind:'nurbs' — optional rational weights, same grid shape as controls. Ignored in slice-1.",
            items: { type: 'array', items: { type: 'number' } },
          },
          degree: {
            type: 'object',
            description: "kind:'nurbs' — degrees in U and V; each in [1, nU-1] / [1, nV-1].",
            properties: {
              u: { type: 'integer', minimum: 1 },
              v: { type: 'integer', minimum: 1 },
            },
            required: ['u', 'v'],
          },
          knots: {
            type: 'object',
            description: "kind:'nurbs' — optional explicit knot vectors; missing => clamped uniform inferred.",
            properties: {
              u: { type: 'array', items: { type: 'number' } },
              v: { type: 'array', items: { type: 'number' } },
            },
          },
          periodic: {
            type: 'object',
            description: "kind:'nurbs' — optional periodic flags per parametric direction.",
            properties: {
              u: { type: 'boolean' },
              v: { type: 'boolean' },
            },
          },
          section_sketch_ids: {
            type: 'array',
            description: "kind:'nurbs' — existing sketch FeatureIds (2 or more) to skin a surface through, in order.",
            items: { type: 'string' },
          },
          curve_bindings: {
            type: 'array',
            description: "kind:'boundary' — tuple of 4 existing Curve3D variable names (bottom, right, top, left) declared earlier in the source.",
            items: { type: 'string' },
            minItems: 4,
            maxItems: 4,
          },
          continuity: {
            description: "kind:'boundary' — continuity grade applied to every edge ('C0' | 'C1' | 'C2'), or an array of 4 grades (one per edge, bottom/right/top/left order). Default 'C0'.",
            oneOf: [
              { type: 'string', enum: ['C0', 'C1', 'C2'] },
              { type: 'array', items: { type: 'string', enum: ['C0', 'C1', 'C2'] }, minItems: 4, maxItems: 4 },
            ],
          },
          sampling: { type: 'integer', minimum: 1, description: "kind:'boundary' — OCCT NbPtsOnCur sampling parameter (default 15)." },
          binding_name: {
            type: 'string',
            description: "JS const name for the new binding (kind:'nurbs' default surface_<N>; kind:'boundary' default _surface_<N>; kind:'trim' default _trimmed_<N>; kind:'sew' default _sewn_<N>; kind:'draft' default _drafted_<N>).",
          },
          // kind:'trim' params
          surface_binding: {
            type: 'string',
            description: "kind:'trim' — JS variable name of the Surface to trim/split (must be declared in source).",
          },
          by_binding: {
            type: 'string',
            description: "kind:'trim' — JS variable name of the cutter Surface (must be declared in source). Shape/Curve3D cutters are deferred.",
          },
          op: {
            type: 'string',
            enum: ['trim', 'split'],
            description: "kind:'trim' — 'trim' discards the smaller half (calls .trimTo()); 'split' retains both halves (calls .split()).",
          },
          // kind:'sew' params
          surface_bindings: {
            type: 'array',
            description: "kind:'sew' — JS variable names of the surfaces to stitch into a solid (each must be declared in source).",
            items: { type: 'string' },
            minItems: 1,
          },
          tolerance: {
            type: 'number',
            description: "kind:'sew' — edge-merging tolerance in mm (default 1e-6). Edges within this distance are merged.",
          },
          require_closed: {
            type: 'boolean',
            description: "kind:'sew' — when true the lowerer emits feature.surface-sew.open-shell if the stitched result is not a watertight solid.",
          },
          // kind:'draft' params
          shape_binding: {
            type: 'string',
            description: "kind:'draft' — JS variable name of the Shape to taper (must be declared in source).",
          },
          angle_deg: {
            type: 'number',
            minimum: 0,
            maximum: 90,
            description: "kind:'draft' — draft angle in degrees [0, 90]. The face is tapered outward by this angle relative to the pull direction.",
          },
          face: {
            type: 'string',
            description: "kind:'draft' — face selector for the face(s) to taper. Accepts a canonical name (top/bottom/front/back/left/right), a user label declared via faceLabels, or a FaceQuery descriptor string.",
          },
          neutral_plane: {
            type: 'string',
            description: "kind:'draft' — parting-line face (the plane where drafted faces remain fixed). Defaults to `face` if omitted.",
          },
          pull_dir: {
            type: 'array',
            items: { type: 'number' },
            minItems: 3,
            maxItems: 3,
            description: "kind:'draft' — demoulding direction as [x, y, z]. Defaults to the face normal at lower time.",
          },
        },
        required: ['kind', 'code'],
      },
    },
    handler: input => addSurfaceTool(input as unknown as Parameters<typeof addSurfaceTool>[0]),
  },
  {
    definition: {
      name: 'add_curve',
      description:
        "Use this when you need a freeform/organic 3D curve — a body feature line, brow, spine rail, or G2 blend between panels — authored as a Curve3D into the user's .kcad.ts immediately before the last top-level return. One authoring path, selected by `kind`:\n" +
        "- 'nurbs' — insert a `nurbsCurve(controlPoints, opts?)` declaration. Pass `controlPoints` as a Vec3[] (mm, at least 2 points). Optional NURBS knobs: `degree` (default 3), rational `weights`, explicit `knots`, `closed`.\n" +
        "- 'hermite' — insert a `hermiteG2(a, b)` declaration: a quintic Hermite curve interpolating two endpoints with matching positions, tangents, and (optional) curvatures — bridges two curves with G2 continuity. Each endpoint is `{ point: Vec3, tangent: Vec3, curvature?: Vec3 }` in mm; tangent magnitude ~ chord length; curvature defaults to [0,0,0] (G1-only).\n" +
        "The returned binding has type Curve3D (peer to Shape / Surface) — consume it via `add_variable_sweep` (spine input), `add_surface({ kind: 'boundary' })` (boundary curve), or downstream Curve3D-accepting features. Returns the modified code + diagnostics from re-evaluating. Side-effect-free. Each kind fails closed on its own missing required params.",
      inputSchema: {
        type: 'object',
        properties: {
          kind: {
            type: 'string',
            enum: ['nurbs', 'hermite'],
            description: 'Which curve-construction path to use.',
          },
          code: { type: 'string', description: 'The .kcad.ts source code.' },
          controlPoints: {
            type: 'array',
            description: "kind:'nurbs' — control points as Vec3 triples in mm; at least 2 entries.",
            items: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
          },
          degree: { type: 'integer', minimum: 1, description: "kind:'nurbs' — curve degree; default 3 (cubic)." },
          weights: {
            type: 'array',
            description: "kind:'nurbs' — optional rational weights, one per control point (same length as controlPoints).",
            items: { type: 'number' },
          },
          knots: {
            type: 'array',
            description: "kind:'nurbs' — optional explicit knot vector; missing => clamped-uniform inferred.",
            items: { type: 'number' },
          },
          closed: { type: 'boolean', description: "kind:'nurbs' — optional periodic/closed-curve flag." },
          a: {
            type: 'object',
            description: "kind:'hermite' — start endpoint.",
            properties: {
              point: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: 'Endpoint position in mm.' },
              tangent: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: 'First derivative of the curve at this endpoint.' },
              curvature: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: 'Optional second derivative; defaults to [0, 0, 0] (G1-only).' },
            },
            required: ['point', 'tangent'],
          },
          b: {
            type: 'object',
            description: "kind:'hermite' — end endpoint.",
            properties: {
              point: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
              tangent: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
              curvature: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
            },
            required: ['point', 'tangent'],
          },
          binding_name: { type: 'string', description: 'JS const name for the new Curve3D binding (default: _curve_<N>).' },
        },
        required: ['kind', 'code'],
        allOf: [
          { if: { properties: { kind: { const: 'nurbs' } } }, then: { required: ['controlPoints'] } },
          { if: { properties: { kind: { const: 'hermite' } } }, then: { required: ['a', 'b'] } },
        ],
      },
    },
    handler: input => addCurveTool(input as unknown as Parameters<typeof addCurveTool>[0]),
  },
  {
    definition: {
      name: 'add_path_segment',
      description:
        "Use this when you need a freeform/organic 2D outline — an eyewear brow, ergonomic grip, sneaker midsole, or body silhouette — by appending a curved segment to an existing PathBuilder chain on the named `chain_anchor` variable. The call is injected at the END of the chain, immediately before any `.close()`. One segment kind, selected by `kind`:\n" +
        "- 'spline' — `.spline(points, opts?)`: interpolates through every `points` waypoint (Vec2[] mm, >= 2 entries; points[0] must match current pen position). Optional `tension`, and `startTangent`/`endTangent` 2D direction vectors that constrain the first-derivative direction at the endpoints (magnitude normalised internally). Use for organic 2D outlines (eyewear brow, ergonomic handle, sneaker midsole).\n" +
        "- 'nurbs' — `.nurbsSegment(controlPoints, opts?)`: explicit B-spline net (Vec2[] mm, >= degree+1 entries; controlPoints[0] must match pen; pen ends at controlPoints[N-1]). Optional `degree` (default 3), rational `weights` (strictly positive), explicit `knots` (length = controlPoints.length + degree + 1).\n" +
        "- 'hermite' — `.hermiteG2(a, b)`: each endpoint `{ point: Vec2, tangent: Vec2, curvature?: Vec2 }` in mm (a.point must match pen; pen ends at b.point). `curvature` defaults to [0,0] (G1); pass matching curvatures for G2 blends. Tangent magnitude is the first derivative (~ chord length), NOT unit length.\n" +
        'Returns the modified code + diagnostics from re-evaluating. Side-effect-free. Each kind fails closed on its own missing required params.',
      inputSchema: {
        type: 'object',
        properties: {
          kind: {
            type: 'string',
            enum: ['spline', 'nurbs', 'hermite'],
            description: 'Which path-segment kind to append.',
          },
          code: { type: 'string', description: 'The .kcad.ts source code.' },
          chain_anchor: { type: 'string', description: 'JS identifier of an existing PathBuilder binding (e.g. `const brow = path().moveTo(0,0)`).' },
          points: {
            type: 'array',
            description: "kind:'spline' — waypoints as Vec2 pairs in mm; at least 2 entries; first must match current pen position.",
            items: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
            minItems: 2,
          },
          tension: { type: 'number', description: "kind:'spline' — optional Catmull-Rom-style stiffness; forwarded to the underlying B-spline approximation." },
          startTangent: {
            type: 'array',
            description: "kind:'spline' — optional [x, y] direction vector at points[0]. Magnitude is normalised internally; direction matters.",
            items: { type: 'number' },
            minItems: 2,
            maxItems: 2,
          },
          endTangent: {
            type: 'array',
            description: "kind:'spline' — optional [x, y] direction vector at points[N-1]. Magnitude is normalised internally; direction matters.",
            items: { type: 'number' },
            minItems: 2,
            maxItems: 2,
          },
          controlPoints: {
            type: 'array',
            description: "kind:'nurbs' — control-net vertices as Vec2 pairs in mm; at least degree+1 entries.",
            items: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
          },
          degree: { type: 'integer', minimum: 1, description: "kind:'nurbs' — B-spline degree (default 3)." },
          weights: {
            type: 'array',
            description: "kind:'nurbs' — optional rational weights (one per control point; strictly positive).",
            items: { type: 'number' },
          },
          knots: {
            type: 'array',
            description: "kind:'nurbs' — optional explicit knot vector; length must equal controlPoints.length + degree + 1.",
            items: { type: 'number' },
          },
          a: {
            type: 'object',
            description: "kind:'hermite' — start endpoint; point must match current pen position within 1e-6 mm.",
            properties: {
              point: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
              tangent: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
              curvature: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
            },
            required: ['point', 'tangent'],
          },
          b: {
            type: 'object',
            description: "kind:'hermite' — end endpoint.",
            properties: {
              point: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
              tangent: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
              curvature: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
            },
            required: ['point', 'tangent'],
          },
          binding_name: { type: 'string', description: 'Reserved for future use; the segment injection mutates the chain anchor in place.' },
        },
        required: ['kind', 'code', 'chain_anchor'],
        allOf: [
          { if: { properties: { kind: { const: 'spline' } } }, then: { required: ['points'] } },
          { if: { properties: { kind: { const: 'nurbs' } } }, then: { required: ['controlPoints'] } },
          { if: { properties: { kind: { const: 'hermite' } } }, then: { required: ['a', 'b'] } },
        ],
      },
    },
    handler: input => addPathSegmentTool(input as unknown as Parameters<typeof addPathSegmentTool>[0]),
  },
  {
    definition: {
      name: 'trace_from_image',
      description:
        "Use this when you need to trace features from a reference photo into waypoints. " +
        "Trace pixel-space features from a reference photo into normalized [0..1] waypoints the agent can map to mm via a known scale anchor and feed to path().spline / path().nurbsSegment. Three backends are dispatched behind the scenes: `opencv` (deterministic; uniform-bg silhouette only), `vision-llm` (Claude vision; named points/cluttered backgrounds; caller-supplied ANTHROPIC_API_KEY), and `hybrid` (opencv silhouette + LLM-labeled named points). Default backend is `auto` — the tool picks based on the image's corner-color stddev. Accuracy honesty: opencv contour is geometrically exact; vision-LLM is typically 5–10% off on dense landmarks. Per-feature `confidence` is reported. Caller pays for any vision-LLM API spend via their own ANTHROPIC_API_KEY. Pair with the `kernelcad-trace-from-image` skill for the conversion-to-mm pipeline.",
      inputSchema: {
        type: 'object',
        properties: {
          imageUrl: {
            type: 'string',
            description: 'URL or path to the reference image. Supports file://, http(s)://, data:image/...;base64,..., or a bare filesystem path.',
          },
          hint: {
            type: 'string',
            description: 'Optional free-text hint forwarded to vision-LLM backends (e.g. "a pair of eyewear; trace the upper brow only").',
          },
          features: {
            type: 'array',
            description: 'Features to trace. Defaults to a single { label: "silhouette", kind: "silhouette" } when omitted.',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string', description: 'Caller-chosen identifier (echoed in the response).' },
                kind: {
                  type: 'string',
                  enum: ['silhouette', 'curve', 'point', 'bbox'],
                  description: 'Geometric shape of the requested feature.',
                },
                region: {
                  type: 'string',
                  description: 'Optional free-text region hint forwarded to vision-LLM backends; ignored by opencv.',
                },
              },
              required: ['label', 'kind'],
            },
          },
          maxWaypointsPerFeature: {
            type: 'integer',
            description: 'Cap on waypoints per feature. Defaults to 12 (suitable for medium-inflection outlines).',
            minimum: 2,
          },
          backend: {
            type: 'string',
            enum: ['opencv', 'vision-llm', 'hybrid', 'auto'],
            description: 'Force a specific backend; default `auto` routes by corner-color stddev.',
          },
        },
        required: ['imageUrl'],
      },
    },
    handler: input => traceFromImageTool(input as unknown as Parameters<typeof traceFromImageTool>[0]),
  },
  {
    definition: {
      name: 'add_variable_sweep',
      description:
        "Use this when you need an organic swept solid whose cross-section changes along its length — a tapering body, horn, bottle, fairing, or duct — authored as a variable-section sweep along a spine. " +
        "Insert a `variableSweep(spine, sections, opts?)` declaration into the user's .kcad.ts immediately before the last top-level return. The result is a Shape — chain `.translate(...)`, `.union(...)`, etc. via `add_feature`. `spine_binding` references an existing variable (Curve3D / Sketch / Vec3[]) in the source; each `sections[i].profile_binding` references an existing Sketch. Sections must be strictly increasing in `t` and span [0, 1]; first t=0, last t=1. Orientation is not exposed by this MCP tool until runtime orientation support is wired. Validates every binding exists in the source via regex before inserting (fast structured error vs capture-time stack). Returns the modified code + diagnostics. Side-effect-free.",
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The .kcad.ts source code.' },
          spine_binding: { type: 'string', description: 'Existing variable name for a Curve3D / Sketch / Vec3[] declared earlier in the source.' },
          sections: {
            type: 'array',
            description: 'Varying cross-sections along the spine; at least 2 entries, strictly increasing in `t`, first t=0, last t=1.',
            items: {
              type: 'object',
              properties: {
                t: { type: 'number', description: 'Spine parameter in [0, 1].' },
                profile_binding: { type: 'string', description: 'Existing Sketch variable name for this section.' },
              },
              required: ['t', 'profile_binding'],
            },
          },
          closed: { type: 'boolean', description: 'Optional closed-sweep flag.' },
          continuity: { type: 'string', enum: ['C0', 'C1', 'C2'], description: "Inter-section continuity; default 'C1'." },
          binding_name: { type: 'string', description: 'JS const name for the new Shape binding (default: _sweep_<N>).' },
        },
        required: ['code', 'spine_binding', 'sections'],
      },
    },
    handler: input => addVariableSweepTool(input as unknown as Parameters<typeof addVariableSweepTool>[0]),
  },
  {
    definition: {
      name: 'add_text',
      description:
        'Use this when you need to author text into a kernelCAD script before the last top-level return. One authoring path, selected by `mode`:\n' +
        "- 'sketch' — insert a sketch.text(...) call. The emitted sketch is chainable: pair with subsequent .extrude(...) / cut(...) edits to land an engraved or raised text feature.\n" +
        "- 'emboss' — insert a `<shape>.embossText({...})` chained call onto an existing Shape `target`. Use for engraved brand text on faces (Ray-Ban temple, CE mark, model number). `depth > 0` raises text out of the face; `depth < 0` engraves text into the face. Lowers via replicad drawText → sketchOnFace → extrude → fuse|cut.\n" +
        'Default font is the runtime-bundled Liberation Sans. Side-effect-free; returns the modified code plus diagnostics from re-evaluating. Each mode fails closed on its own missing required params.',
      inputSchema: {
        type: 'object',
        properties: {
          mode: {
            type: 'string',
            enum: ['sketch', 'emboss'],
            description: 'Which text-authoring path to use.',
          },
          code:        { type: 'string', description: 'The .kcad.ts source code.' },
          content:     { type: 'string', description: "mode:'sketch' — text content (UTF-8, non-empty, non-whitespace)." },
          size:        { type: 'number', description: "mode:'sketch'|'emboss' — glyph cap height in mm (positive finite)." },
          font:        { type: 'string', description: "mode:'sketch' — optional logical font name or .ttf file path; defaults to bundled Liberation Sans." },
          align:       { type: 'string', enum: ['left', 'center', 'right'], description: "mode:'sketch' — horizontal alignment relative to position (default left); mode:'emboss' — relative to the UV anchor (default center)." },
          position:    { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: "mode:'sketch' — [x, y] anchor in mm. Default [0, 0]." },
          rotation:    { type: 'number', description: "mode:'sketch' — CCW rotation in degrees around position (default 0); mode:'emboss' — CCW rotation in the face tangent plane (default 0)." },
          bindAs:      { type: 'string', description: "mode:'sketch' — emits `const <bindAs> = sketch.text(...)`; mode:'emboss' — emits `const <bindAs> = <target>.embossText(...);`." },
          target:      { type: 'string', description: "mode:'emboss' — variable name of the Shape to chain onto (inserted verbatim)." },
          textContent: { type: 'string', description: "mode:'emboss' — text content (UTF-8, non-empty, non-whitespace)." },
          depth:       { type: 'number', description: "mode:'emboss' — signed extrusion depth in mm: positive emboss out, negative engrave in. Must be non-zero." },
          face:        { type: 'string', description: "mode:'emboss' — target face — canonical name ('top'/'bottom'/'left'/'right'/'front'/'back') or label." },
          fontFamily:  { type: 'string', description: "mode:'emboss' — optional logical font name or .ttf file path; defaults to bundled Liberation Sans." },
          anchorU:     { type: 'number', description: "mode:'emboss' — U anchor in [0, 1] face-local (0=umin, 0.5=centre, 1=umax). Default 0.5." },
          anchorV:     { type: 'number', description: "mode:'emboss' — V anchor in [0, 1] face-local. Default 0.5." },
          scaleMode:   { type: 'string', enum: ['original', 'native', 'bounds'], description: "mode:'emboss' — Drawing.sketchOnFace scaling mode. Default original." },
        },
        required: ['mode', 'code'],
      },
    },
    handler: input => addTextTool(input as unknown as Parameters<typeof addTextTool>[0]),
  },
  {
    definition: {
      name: 'project_curve',
      description: 'Use this when you need to wrap a 2D closed curve onto a 3D face. Insert a `<shape>.projectCurve({ source, face, scaleMode? })` chained call into a kernelCAD script. The `source` is the structured `{ kind: "sketchCommands", commands: [...] }` wire format the runtime API accepts. Wraps the curve onto the face along the face normal; pair with `.extrude(d)` / `.cut(...)` for raised or engraved logos on curved bodies. Open-wire projection (`asEdge: true`) is deferred (BRepProj_Projection not bundled) and is rejected at edit time. Side-effect-free; returns modified code plus diagnostics.',
      inputSchema: {
        type: 'object',
        properties: {
          code:      { type: 'string', description: 'The .kcad.ts source code.' },
          target:    { type: 'string', description: 'Variable name of the Shape to chain onto.' },
          commands:  {
            type: 'array',
            description: 'Closed 2D path to wrap onto the face, as plain-number commands. Must start with a `moveTo` and end with a `close` (e.g. [{kind:"moveTo",x:0,y:0},{kind:"lineTo",x:2,y:0},{kind:"lineTo",x:2,y:2},{kind:"close"}]).',
            items: {
              type: 'object',
              properties: {
                kind: { type: 'string', enum: ['moveTo', 'lineTo', 'close'] },
                x:    { type: 'number' },
                y:    { type: 'number' },
              },
              required: ['kind'],
            },
          },
          face:      { type: 'string', description: 'Target face — canonical name or label.' },
          scaleMode: { type: 'string', enum: ['original', 'native', 'bounds'], description: 'Drawing.sketchOnFace scaling mode. Default original.' },
          asEdge:    { type: 'boolean', description: 'Open-wire (edge) projection. DEFERRED — rejected at edit time (BRepProj_Projection not bundled).' },
          bindAs:    { type: 'string', description: 'Optional local variable name; emits `const <bindAs> = <target>.projectCurve(...);`.' },
        },
        required: ['code', 'target', 'commands', 'face'],
      },
    },
    handler: input => projectCurveTool(input as unknown as Parameters<typeof projectCurveTool>[0]),
  },
  {
    definition: {
      name: 'add_pattern_feature',
      description: "Use this when you need to repeat a feature in a pattern. Insert a Shape.patternLinear / .patternCircular / .patternGrid call into a kernelCAD script before the last top-level return. Pass structured args (kind + the matching spec object). Returns the modified code plus diagnostics from re-evaluating. Side-effect-free. The pattern feature is a single editable unit; pattern-instance face refs resolve via `<sourceId>_pattern_<i>` on the pattern feature's lineage. Geometric note: pattern is implemented as cumulative boolean union of transformed source copies — additive features (boxes, ribs, fins, spokes) pattern cleanly; patterning a subtractive feature (hole, cutout) only preserves the per-instance void when adjacent bodies are disjoint.",
      inputSchema: {
        type: 'object',
        properties: {
          code:      { type: 'string', description: 'The .kcad.ts source code.' },
          target:    { type: 'string', description: 'Variable name of the Shape to pattern (inserted verbatim as the LHS receiver).' },
          kind:      { type: 'string', enum: ['linear', 'circular', 'grid'] },
          linear:    { type: 'object', description: 'Required when kind=linear.', properties: {
            count: { type: 'integer', minimum: 2 },
            direction: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
            spacing: { type: 'number' },
          }, required: ['count', 'direction', 'spacing'] },
          circular:  { type: 'object', description: 'Required when kind=circular.', properties: {
            count: { type: 'integer', minimum: 2 },
            axis: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
            angleDeg: { type: 'number', description: 'Optional; defaults to 360.' },
          }, required: ['count', 'axis'] },
          grid:      { type: 'object', description: 'Required when kind=grid.', properties: {
            x: { type: 'object', description: 'First grid axis.', properties: {
              count: { type: 'integer', minimum: 2 },
              direction: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
              spacing: { type: 'number' },
            }, required: ['count', 'direction', 'spacing'] },
            y: { type: 'object', description: 'Second grid axis.', properties: {
              count: { type: 'integer', minimum: 2 },
              direction: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
              spacing: { type: 'number' },
            }, required: ['count', 'direction', 'spacing'] },
          }, required: ['x', 'y'] },
          assign_to: { type: 'string', description: "Optional const-binding name; emits `const <assign_to> = <target>.patternX(...);`. Omit for statement form." },
        },
        required: ['code', 'target', 'kind'],
        allOf: [
          { if: { properties: { kind: { const: 'linear' } } }, then: { required: ['linear'] } },
          { if: { properties: { kind: { const: 'circular' } } }, then: { required: ['circular'] } },
          { if: { properties: { kind: { const: 'grid' } } }, then: { required: ['grid'] } },
        ],
      },
    },
    handler: input => addPatternFeatureTool(input as unknown as Parameters<typeof addPatternFeatureTool>[0]),
  },
  {
    definition: {
      name: 'remove_feature',
      description: 'Use this when you need to remove a feature line from a script. Remove a single line from a kernelCAD script identified by a substring match. Returns the modified code plus diagnostics from re-evaluating. Refuses to remove the line containing the return statement. Side-effect-free.',
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The .kcad.ts source code.' },
          match: { type: 'string', description: 'A substring that uniquely identifies the line to remove (e.g. `const hole = cylinder(5,`).' },
        },
        required: ['code', 'match'],
      },
    },
    handler: input => removeFeatureTool(input as unknown as Parameters<typeof removeFeatureTool>[0]),
  },
];
