// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingAuto/contracts.ts

import type { OcctBackend } from '../occtBackend';
import type { CompilerDiagnostic } from '../../../../shared/diagnostics/diagnostic';
import type { DrawingDatumDecl, DrawingDeclarations } from '../../../../shared/intent/drawingGdtRecord';
import type { DrawingViewName, Polyline2, SheetSpec, ViewPlacement } from '../drawingLayout';
import type { WorldFramePart } from '../sceneToWorldFrame';
import type { V3 } from '../drawingFeatures';
import type { AutoAnnotateOptions } from './options';

export interface DrawingReportAnnotation {
  kind: string;
  view: DrawingViewName;
  text: string;
  overlapped: boolean;
}

export interface DrawingReport {
  /** Annotations rendered clear of geometry, other labels and the frame. */
  placed: number;
  /** Annotations rendered but still colliding with something. */
  overlapped: number;
  byKind: Record<string, number>;
  datums: Array<{ label: string; source: 'auto' | 'declared'; normal: V3 | null; point: V3 }>;
  annotations: DrawingReportAnnotation[];
  /** Title-block general-tolerance note, e.g. `ISO 2768-mK`. */
  generalTolerance?: string;
}

export interface AutoDrawingInput {
  parts: readonly WorldFramePart[];
  compound: OcctBackend;
  autoAnnotate: boolean | AutoAnnotateOptions | undefined;
  declarations: DrawingDeclarations;
  /** Datums `options.annotations` already draws — they constrain the rules
   *  but are not drawn again. */
  authoredDatums: readonly DrawingDatumDecl[];
  /** Authored annotation SVG fragments, whose labels are obstacles. */
  authoredSvg: readonly string[];
  views: Record<DrawingViewName, { placement: ViewPlacement; polylines: readonly Polyline2[] }>;
  scale: number;
  sheet: SheetSpec;
  bottomReserve: Record<DrawingViewName, number>;
  rightReserve: Record<DrawingViewName, number>;
  /** Other sheet markup (section indicators) whose lines and labels are
   *  obstacles too. */
  extraObstacleSvg?: string;
}

export interface AutoDrawingResult {
  svg: string[];
  bottomReserve: Record<DrawingViewName, number>;
  generalTolerance?: string;
  report: DrawingReport;
  diagnostics: CompilerDiagnostic[];
}
