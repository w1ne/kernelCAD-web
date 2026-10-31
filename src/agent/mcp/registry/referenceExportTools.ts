// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { exportTool } from '../tools/export';
import { listApiTool } from '../tools/listApi';
import { listDiagnosticCodesTool } from '../tools/listDiagnosticCodes';
import { PRINTER_PROFILE_IDS } from '../../../kernel/export/gcode/printerProfiles';
import type { ToolRegistryEntry } from './types';

export const referenceExportToolEntries: ToolRegistryEntry[] = [
  {
    definition: {
      name: 'lookup_api',
      description:
        'Use this when you need to list the kernelCAD script-runtime surface: global functions (box, path, selectEdges, helix, etc), Shape methods (fillet, sweep, lower, etc), Sketch methods (extrude, revolve, sweep), PathBuilder methods, EdgeQuery/FaceQuery key sets, and featureKindFaceLabels (which globals accept opts.faceLabels and valid value shapes). Use this to discover what is callable from a .kcad.ts script.' +
        ' Call this BEFORE concluding kernelCAD lacks a capability — its NURBS freeform surfacing (loft, sweep, boundary-fill, G2 blend) is easy to miss from tool names alone.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    handler: input => listApiTool(input as Parameters<typeof listApiTool>[0]),
  },
  {
    definition: {
      name: 'lookup_diagnostics',
      description:
        'Use this when you need the kernelCAD 26-code diagnostic catalogue with hint templates. ' +
        'Tiny one-shot call; useful for an agent that wants to pre-populate ' +
        'retry strategies. Hints are also inline on every emitted diagnostic — ' +
        'this tool just gives you the canonical list up front.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    handler: input => listDiagnosticCodesTool(input as Parameters<typeof listDiagnosticCodesTool>[0]),
  },
  {
    definition: {
      name: 'export',
      description:
        'Use this when you need to export geometry to a file. One exporter, selected by `target`:\n' +
        "- target:'model' — export the script geometry to one file. Pass { file | code }, a required { output_path }, and { format }. " +
        'Supported formats: stl (binary STL mesh), step (BREP CAD interchange), ' +
        'dxf (2D cut file for laser / waterjet / CNC: a flat part — plate, panel, extruded profile, in any orientation — exports its outline and holes in its own plane with exact arcs and circles; '
        + 'a sheet-metal part or a returned Region exports its flat pattern; a flat or sheet-metal part also returns sheet { thickness_mm, bend_count }, which a shop needs and the DXF does not carry; options.section { axis: "x"|"y"|"z", at } exports the cross-section of any part in world coordinates (plans, profiles); '
        + "a multi-part model (cut list) writes all parts side by side on output_path, one layer per part, plus parts/<part>.dxf per part (reported in part_files; options.layout 'sheet' writes the combined sheet only); "
        + 'any other part fails with export.dxf.non-planar), ' +
        "3mf (slicer-friendly mesh: one named object per part, colours as core-spec basematerials named by the part's engineering material; " +
        "options.arrange 'plate' packs parts on the bed at Z=0 without overlap (options.orient puts each part's largest flat face down), 'assembled' keeps them together as one multi-part object for multi-colour prints; " +
        "options.slicer 'bambu' | 'orca' | 'prusa' adds that slicer's per-object name + filament-slot sidecar — slot N is the Nth distinct colour/material), " +
        "options.infill { fromFea: '<study>' | true, bands?, pattern? } = stress-graded FDM infill (requires the local CalculiX + gmsh toolchain; without it the export fails with fea.solver.unavailable): " +
        "solves the feaStudy and writes modifier volumes, each with its own infill density (Orca/Bambu format by default; options.slicer 'prusa' writes PrusaSlicer's format instead, since the two are not interchangeable); the result carries infill { bands, saving, images }), " +
        'gcode (installed OrcaSlicer output; preserves G-code and returns optional gcode_stats with header generator identity and slicer-predicted time/material), ' +
        'glb (web-viewer / AR with PBR materials), obj (Wavefront indexed triangle mesh), ply (Stanford PLY triangle mesh, mm, Z-up, binary little-endian by default, with per-vertex normals and the part colour from .finish()/.material()/.color(); an assembly is one file with every part in world space), usd (ASCII USDA triangle mesh in millimeter, Z-up coordinates; multi-part scenes emit one named mesh per part), ' +
        'svg-drawing (third-angle engineering-drawing sheet: front/top/left + isometric views, hidden edges dashed, tangent edges thin, ' +
        'overall bounding-box dimensions, title block; assemblies are drawn with inter-part occlusion; pass options.annotations to dimension specific features instead of the bounding box; ' +
        'pass options.exploded { factor, mode } to explode the isometric cell, options.balloons to number parts from the BOM, and options.partsList for an item/name/qty/material table above the title block). ' +
        'overall bounding-box dimensions, title block; assemblies are drawn with inter-part occlusion; pass options.annotations to dimension specific features instead of the bounding box, ' +
        'options.autoAnnotate to derive datums A/B/C, grouped hole callouts with position tolerances, hole positions, overall size, radius and chamfer callouts, flatness and an ISO 2768 note from the geometry ' +
        '(the result carries drawing_report with placed / overlapped counts), and options.sections for real section views on any cutting plane). ' +
        'pdf-drawing (the same sheet — views, dashed hidden lines, dimensions, hole callouts, GD&T, sections, parts list — as a printable vector PDF on a standard sheet, one call: ' +
        'ISO a4|a3|a2|a1|a0 or ANSI ansi-a…ansi-e landscape, default a3, or sheet "auto" / "auto-ansi" for the smallest sheet that holds the views at 1:1; the drawing scale is picked to fit; ' +
        'projection "third" (default) or "first" arranges the views and draws the matching symbol; a full title block carries title, part name, material, scale, units, sheet size, date and revision, ' +
        'settable through options.title / partName / material / revision / date; autoAnnotate is on unless options.annotations is given). ' +
        'Robot descriptions: urdf (tree-topology robot description), srdf (motion-planning semantics layered over the URDF), sdf-gazebo (SDFormat 1.10 with native ball joints, closed loops, and solved per-link poses), ' +
        "usd-isaac (ASCII USD physics stage: PhysicsArticulationRootAPI root, one rigid body per link at its solved pose with mass / centre of mass / principal inertia, " +
        'PhysicsFixedJoint/PhysicsRevoluteJoint/PhysicsPrismaticJoint per mate with token axis, two-sided joint frames and limits, UsdPreviewSurface materials from the part appearance, ' +
        'and joint drives only when declared in options.drives { <mate>: { stiffness, damping, maxForce?, targetPosition? } }; options.collisionApproximation is convexHull | convexDecomposition; ' +
        'planar/cylindrical/pin_slot/ball mates fail closed with export.usd.joint-unsupported). ' +
        "bom-csv / bom-json (bill of materials over assembly.model()/solvedModel(): one row per distinct part — grouped by geometry/catalog identity, not name — with real instance quantity, kind, material, density, mass, bbox, fabrication process (`process` + `processSource`), and catalog provenance for purchased parts; same numbers as inspect({ of: 'bom' })). " +
        "bend-table (tube bender tables over tube() records: one <tube name>.csv per tube with the LRA bend table, XYZ points, cut length and last straight; output_path is a DIRECTORY and the written files are reported in table_files; a script with no tube() fails with export.bend-table.no-tubes, and a script whose tube gates report errors writes nothing). " +
        'urdf and sdf-gazebo also write one meshes/<part>.stl per link, and usd-isaac one meshes/<part>.usda mesh layer per link, next to output_path (reported in mesh_files) — ship the whole directory to the consumer. ' +
        'STL exports run a watertight verify by default; failures return ok: false with export.mesh.not-watertight ' +
        '(open-edge count + up to 5 crack-cluster locations) but the file is still written so the broken mesh can be inspected. ' +
        'STEP exports check B-rep validity and mesh watertightness by default; failures return ok: false with export.brep.invalid or export.mesh.not-watertight, while keeping the STEP file for inspection. ' +
        'Set options.verify: false or pass { no_verify: true } to skip STEP checks. ' +
        'Optional { feature_id } selects which feature to export (default: last). ' +
        'Optional { options } carries per-format options bag (see the kernelcad-mcp skill for the per-format keys: step unit/verify, dxf layers/tolerance/unit/section/layout, 3mf printUnit/embedSource/arrange/orient/slicer/printer/infill, glb axis/draco, ply encoding/normals/colors).\n' +
        "- target:'part' — export solved-assembly parts as individual binary STL files in their modeled (world-frame) positions. " +
        'Pass { file | code }, plus { part, output_path } for one part or { output_dir } for all parts ' +
        '(files land at <output_dir>/<part>.stl). A watertight verify runs on every exported mesh by default ' +
        'and fails the call with export.mesh.not-watertight; unknown part names fail with export.part.not-found listing the valid names.\n' +
        'Pass { no_verify: true } to skip the watertight gate. All params except `target` are forwarded verbatim; each target fails closed on its own missing required params.',
      inputSchema: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            enum: ['model', 'part'],
            description: "Which exporter to run: 'model' (whole-script geometry to one file) or 'part' (per-part STLs from a solved assembly).",
          },
          file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
          code: { type: 'string', description: 'Inline kernelCAD script source.' },
          output_path: { type: 'string', description: "Destination path (a directory for format 'bend-table'). target:'model' — the export file (required). target:'part' — single-part .stl path." },
          format: {
            type: 'string',
            enum: ['stl', 'step', 'dxf', '3mf', 'glb', 'obj', 'ply', 'usd', 'svg-drawing', 'pdf-drawing', 'urdf', 'srdf', 'sdf-gazebo', 'usd-isaac', 'bom-csv', 'bom-json', 'bend-table', 'gcode'],
            description: "target:'model' — output file format (required for that target).",
          },
          feature_id: { type: 'string', description: "target:'model' — optional FeatureId to export; defaults to last." },
          options: {
            type: 'object',
            description:
              "target:'model' — optional per-format options bag. Discriminator options.format must equal top-level format. " +
              'step: { unit?: "mm"|"cm"|"in", verify?: boolean } (verify defaults to true and checks B-rep validity plus mesh watertightness; false skips both). ' +
              'stl: { verify?: boolean } (defaults to true). ' +
              'dxf: { layers?, unit?: "mm"|"cm"|"in", tolerance?, section?: { axis: "x"|"y"|"z", at: mm }, layout?: "per-part"|"sheet" }. ' +
              '3mf: { printUnit?: "mm"|"cm"|"in", embedSource?, arrange?: "none"|"plate"|"assembled", orient?: boolean, slicer?: "generic"|"bambu"|"orca"|"prusa", printer?: printer profile id, one of ' + PRINTER_PROFILE_IDS.map(id => `"${id}"`).join('|') + ' (default "generic-fdm"; sets the bed for arrange and the slicer default; an unknown id is refused with the valid list; CLI: kernelcad print printers) }; parts that do not fit the bed are still written and reported as warn diagnostics export.3mf.plate-overflow / export.3mf.exceeds-bed, whose hint names the smallest profiles the layout fits on. ' +
              'gcode: { printer?: printer profile id, layerHeight?: mm, infill?: percent, supports?: boolean, material?: string }; requires a locally installed OrcaSlicer. Returns slicer predictions as gcode_stats; does not start a printer. ' +
              'glb: { axis?: "y-up"|"z-up", draco?: false, style?: "pbr"|"lowpoly", lowpoly?: { angularDeg?: 5..60 (default 30, about 12 segments per circle), maxTriangles?: number }, units?: "mm"|"m" }. ' +
              'style "lowpoly" writes a faceted, flat-shaded game asset in metres (default) with every opaque part coloured through COLOR_0 on one shared material "kernelcad-palette" (merges to one draw call); asset.extras.kernelcad carries stats { triangles, sizeM, minUpM } and palette zones; exceeding maxTriangles fails with export.glb.triangle-budget. ' +
              'obj and usd are mesh exports with no extra options; usd writes ASCII USDA (millimeter, Z-up). ' +
              'ply: { encoding?: "binary"|"ascii" (default "binary" = binary_little_endian), normals?: boolean (default true; vertices split at creases over 30°), colors?: "vertex"|"face"|"none" (default "vertex": uchar red/green/blue per vertex; "face" puts them on the face element) }; any other key or value fails with export.ply.invalid-options. ' +
              'svg-drawing: { views?: ["front"], sheet?: "a4"|"a3" (or any pdf-drawing sheet), projection?, titleBlock?: { title?, partName?, material?, revision? }, modelName?, date?, annotations?, exploded?: { factor, mode? }, balloons?, partsList?, sections?, autoAnnotate? }. ' +
              'views:["front"] produces a centred front-only elevation for SVG or PDF; omit views for four views. Front-only sheets require front annotations and reject isometric balloons/exploded overlays. ' +
              'svg-drawing annotations is an array of authored dimensions/notes, each '
              + '{ kind: "linear"|"radius"|"diameter"|"angular"|"note", view?: "front"|"top"|"left"|"iso", text?, offset? } plus '
              + 'kind-specific geometry: linear { from, to }, radius/diameter { edge: EdgeQuery }, angular { from: EdgeQuery, to: EdgeQuery }, note { at, text }. '
              + 'from/to/at anchors are an [x,y,z] model point, { edge: EdgeQuery } or { face: FaceQuery }. '
              + 'Supplying any annotation REPLACES the automatic bounding-box dimensions; an annotation whose query resolves to zero or multiple matches fails the export rather than being dropped. '
              + 'svg-drawing sections is an array of { plane: "xy"|"xz"|"yz"|{ origin, normal }, label } (any non-zero normal). '
              + 'svg-drawing autoAnnotate is true or { tolerance?: "ISO2768-f"|"ISO2768-m"|"ISO2768-c", datums?: "auto"|[{ label, face: FaceQuery }], '
              + 'include?: ["datums"|"flatness"|"holes"|"hole-positions"|"overall"|"fillets"|"chamfers"|"general-tolerance"], dimensioningStyle?: "baseline"|"chain"|"symmetry" }; '
              + 'datums and tolerances declared in the script with shape.datum() / shape.tolerance() override the automatic ones. '
              + 'pdf-drawing: { sheet?: "a4"|"a3"|"a2"|"a1"|"a0"|"ansi-a"|"ansi-b"|"ansi-c"|"ansi-d"|"ansi-e"|"auto"|"auto-ansi" (default "a3"), '
              + 'projection?: "third"|"first", title?, partName?, material?, revision?, date? (default today), modelName?, '
              + 'views?: ["front"], annotations?, sections?, exploded?, balloons?, partsList?, autoAnnotate? (default true unless annotations are given) } — the svg-drawing keys mean the same. '
              + 'Mechanical SVG/PDF also accept draftingProfile?: "general"|"machining"|"sheet-metal" or { id, name, sheet, projection, dimensioningStyle, tolerance?, notes? }, with explicit options overriding profile defaults. '
              + 'Functional drawing review: shape.drawingReview(plan) source declarations merge with reviewPlans?: additional plans; decisionResolutions?: { [encodeURIComponent(planId)+":"+encodeURIComponent(decisionId)]: { note, provenance } }. drawing_report.review reports declared geometric-callout coverage and unresolved engineering decisions. requireCompleteReview?: true rejects incomplete/not-declared mechanical reviews before export; architectural style rejects review contracts. Coverage is not engineering certification. '
              + 'annotationOverrides?: { [drawing_report.annotations[i].id]: { suppress?, text?, view?, offset? } }; offset is extra nonnegative sheet mm. Text edits primary labels while preserving attached FCFs; datum/standalone FCF text is changed in its declaration instead. Suppressed rows remain in the report but not visible counts. Missing IDs warn after geometry edits. Authored annotations can set id for stable review identity. '
              + 'svg-drawing and pdf-drawing also take style?: "mechanical" (default, the part sheet) | "architectural" (a floor plan for a building or room model: '
              + 'section about 1 m above the floor with filled cut walls, wall / opening chain dimensions and overall sizes, room labels with net area, scale bar, north arrow; '
              + 'millimetres, or feet-inches when the model is in whole feet / inches) and plan?: { units?: "metric"|"imperial", cutHeight?: mm above the floor, '
              + 'rooms?: [{ name, at: [x, y] }], northDeg?: degrees clockwise from sheet up }. A building-sized model drawn in the default style gets a '
              + 'drawing.style.architectural-suggested warning.',
          },
          part: { type: 'string', description: "target:'part' — part name for single-part export, or 'all'." },
          output_dir: { type: 'string', description: "target:'part' — destination directory (all-parts mode); files are <dir>/<part>.stl." },
          no_verify: { type: 'boolean', description: 'Skip the default STL/STEP validity and watertightness gates.', default: false },
        },
        required: ['target'],
      },
    },
    handler: input => exportTool(input as unknown as Parameters<typeof exportTool>[0]),
  },
];
