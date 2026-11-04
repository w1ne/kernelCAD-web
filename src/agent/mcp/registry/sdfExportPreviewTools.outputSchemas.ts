// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Output schemas for evaluate_sdf, export, send_to_printer, capture_animation,
// and render_preview. Moved out of toolOutputSchemas.ts so that file stays
// under the max-lines ratchet.
import type { JSONSchemaObject } from '../toolOutputSchemas';
import { SCENE_SUMMARY_SCHEMA } from '../sceneSummarySchema';

export const SDF_EXPORT_PREVIEW_OUTPUT_SCHEMAS: Record<string, JSONSchemaObject> = {
  evaluate_sdf: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      distance: { type: 'number', description: 'Signed distance in mm; negative = inside (success).' },
      inside: { type: 'boolean', description: 'Whether the point is inside the surface (success).' },
      aabb: { type: 'object', additionalProperties: true, description: 'Axis-aligned bounding box of the field (success).' },
      kind: { type: 'string', description: 'SDF field kind (success).' },
      error: { type: 'string' },
      errorCode: { type: 'string' },
      hint: { type: 'string' },
    },
    required: ['ok'],
    additionalProperties: true,
  },

  // Merged dispatcher (selected by `target`): union of model/part export outputs.
  export: {
    type: 'object',
    properties: {
      sceneSummary: SCENE_SUMMARY_SCHEMA,
      ok: { type: 'boolean' },
      output_path: { type: 'string', description: "target:'model' — written file path." },
      byte_count: { type: 'number', description: "target:'model' — file size in bytes." },
      feature_count: { type: 'number' },
      format: { type: 'string' },
      gcode_stats: {
        type: 'object',
        description: 'G-code only: slicer predictions and generator identity reported by artifact comments; not physical measurements.',
        properties: {
          slicer: { type: 'object', properties: { name: { type: 'string', enum: ['OrcaSlicer', 'PrusaSlicer'] }, version: { type: 'string' } }, required: ['name', 'version'], additionalProperties: false },
          estimatedPrintTimeSeconds: { type: 'number', minimum: 0 },
          filamentUsedGrams: { type: 'number', minimum: 0 },
          filamentUsedMeters: { type: 'number', minimum: 0 },
          layerCount: { type: 'integer', minimum: 0 },
          maxZMm: { type: 'number', minimum: 0 },
        },
        additionalProperties: false,
      },
      mesh_files: { type: 'array', items: { type: 'string' }, description: 'Per-link mesh files: meshes/<part>.stl for urdf/sdf-gazebo, meshes/<part>.usda mesh layers for usd-isaac.' },
      part_files: { type: 'array', items: { type: 'string' }, description: "Per-part DXF files: parts/<part>.dxf for a multi-part dxf export (layout 'per-part', the default)." },
      written: { type: 'array', items: { type: 'object', additionalProperties: true }, description: "target:'part' — per-part export records." },
      infill: { type: 'object', additionalProperties: true, description: "3mf with options.infill — stress-graded infill: band table (density, stress range, volume %), saving vs uniform infill at the high density, FEA peaks, and images { heatmap, bands, cutaway } PNG paths." },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true } },
      error: { type: 'string' },
    },
    required: ['ok'],
    additionalProperties: true,
  },

  send_to_printer: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      uploaded_path: { type: 'string', description: 'Path/name the G-code (bambu-lan: the .gcode.3mf print file) was stored under on the printer.' },
      dry_run: { type: 'boolean', description: 'True when only connectivity/auth was validated (no upload, no print start).' },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true } },
      error: { type: 'string' },
    },
    required: ['ok'],
    additionalProperties: true,
  },

  capture_animation: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      output_path: { type: 'string', description: 'Written MP4 path (MP4 mode).' },
      frame_count: { type: 'number' },
      duration_ms: { type: 'number' },
      fps: { type: 'number' },
      verified: { type: 'boolean', description: 'Whether pose-interference verification passed.' },
      verify_skipped: { type: 'boolean' },
      collisions: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Colliding poses { t_ms, a, b, volume_mm3 }.' },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true } },
      error: { type: 'string' },
      errorCode: { type: 'string' },
      errorHint: { type: 'string' },
      failure_kind: { type: 'string' },
    },
    required: ['ok', 'diagnostics'],
    additionalProperties: true,
  },

  render_preview: {
    type: 'object',
    properties: {
      sceneSummary: SCENE_SUMMARY_SCHEMA,
      ok: { type: 'boolean', description: 'Whether the preview rendered.' },
      images: {
        type: 'array',
        items: { type: 'object', additionalProperties: true },
        description: 'Rendered tiles { name, path, description } — absolute local PNG paths with per-view camera orientation (kernelCAD is Z-up).',
      },
      out_dir: { type: 'string', description: 'Directory holding the PNGs (session temp dir unless out_dir was given).' },
      bounds: { type: 'object', additionalProperties: true, description: 'Model AABB in mm { min, max } the camera was fit to (success).' },
      mechanism: { type: 'string', description: "Mechanism-truth verdict: 'real' | 'broken' | 'unverified'." },
      mechanism_failure_codes: { type: 'array', items: { type: 'string' }, description: "De-duplicated failure codes when mechanism is 'broken'." },
      render_source: { type: 'string', description: "Lane that served the render: 'static-player' | 'dev-server' | 'explicit'." },
      render_ms: { type: 'number', description: 'Wall-clock render time in ms (provisioning + browser + captures).' },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true } },
      error: { type: 'string' },
      errorCode: { type: 'string' },
      errorHint: { type: 'string' },
    },
    required: ['ok', 'images', 'diagnostics'],
    additionalProperties: true,
  },
};
