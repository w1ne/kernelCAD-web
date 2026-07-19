// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { exportTool } from '../tools/export';
import { listApiTool } from '../tools/listApi';
import { listDiagnosticCodesTool } from '../tools/listDiagnosticCodes';
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
        'Supported formats: stl (binary STL mesh), step (BREP CAD interchange), dxf (planar laser/waterjet profile from a Region or planar face), ' +
        '3mf (slicer-friendly mesh with per-part colors), glb (web-viewer / AR with PBR materials), ' +
        'svg-drawing (third-angle engineering-drawing sheet: front/top/left + isometric views, hidden edges dashed, tangent edges thin, ' +
        'overall bounding-box dimensions, title block; assemblies are drawn with inter-part occlusion; pass options.annotations to dimension specific features instead of the bounding box). ' +
        'Robot descriptions: urdf (tree-topology robot description), srdf (motion-planning semantics layered over the URDF), sdf-gazebo (SDFormat 1.10 with native ball joints, closed loops, and solved per-link poses). ' +
        'urdf and sdf-gazebo also write one meshes/<part>.stl per link next to output_path (reported in mesh_files) — ship the whole directory to the consumer. ' +
        'STL exports run a watertight verify by default; failures return ok: false with export.mesh.not-watertight ' +
        '(open-edge count + up to 5 crack-cluster locations) but the file is still written so the broken mesh can be inspected. ' +
        'Optional { feature_id } selects which feature to export (default: last). ' +
        'Optional { options } carries per-format options bag (see the kernelcad-mcp skill for the per-format keys: dxf layers/tolerance/unit, 3mf printUnit/embedSource, glb axis/draco).\n' +
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
          output_path: { type: 'string', description: "Destination path. target:'model' — the export file (required). target:'part' — single-part .stl path." },
          format: {
            type: 'string',
            enum: ['stl', 'step', 'dxf', '3mf', 'glb', 'svg-drawing', 'urdf', 'srdf', 'sdf-gazebo'],
            description: "target:'model' — output file format (required for that target).",
          },
          feature_id: { type: 'string', description: "target:'model' — optional FeatureId to export; defaults to last." },
          options: {
            type: 'object',
            description:
              "target:'model' — optional per-format options bag. Discriminator options.format must equal top-level format. " +
              'dxf: { layers?, unit?: "mm"|"cm"|"in", tolerance? }. ' +
              '3mf: { printUnit?: "mm"|"cm"|"in", embedSource? }. ' +
              'glb: { axis?: "y-up"|"z-up", draco?: false }. ' +
              'svg-drawing: { sheet?: "a4"|"a3", modelName?, date?, annotations? }. '
              + 'svg-drawing annotations is an array of authored dimensions/notes, each '
              + '{ kind: "linear"|"radius"|"diameter"|"angular"|"note", view?: "front"|"top"|"left"|"iso", text?, offset? } plus '
              + 'kind-specific geometry: linear { from, to }, radius/diameter { edge: EdgeQuery }, angular { from: EdgeQuery, to: EdgeQuery }, note { at, text }. '
              + 'from/to/at anchors are an [x,y,z] model point, { edge: EdgeQuery } or { face: FaceQuery }. '
              + 'Supplying any annotation REPLACES the automatic bounding-box dimensions; an annotation whose query resolves to zero or multiple matches fails the export rather than being dropped.',
          },
          part: { type: 'string', description: "target:'part' — part name for single-part export, or 'all'." },
          output_dir: { type: 'string', description: "target:'part' — destination directory (all-parts mode); files are <dir>/<part>.stl." },
          no_verify: { type: 'boolean', description: 'Skip the STL watertight verify gate.', default: false },
        },
        required: ['target'],
      },
    },
    handler: input => exportTool(input as unknown as Parameters<typeof exportTool>[0]),
  },
];
