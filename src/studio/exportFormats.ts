// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The server export formats the Studio offers (Export tab, command palette).
import type { GeometryResult } from '../shared/worker/geometryEngine';
import type { StudioExportFormat } from './exportViaServer';

export interface ExportFormatDescriptor {
    id: StudioExportFormat;
    label: string;
    help: string;
    requiresPlanar?: boolean;
}

export const EXPORT_FORMATS: ReadonlyArray<ExportFormatDescriptor> = [
    { id: 'stl', label: 'STL', help: 'Mesh; printable / preview' },
    { id: 'step', label: 'STEP', help: 'BREP; CAD interchange' },
    { id: 'dxf', label: 'DXF', help: 'Planar profile; laser / waterjet', requiresPlanar: true },
    { id: '3mf', label: '3MF', help: 'Slicer mesh with per-part colors' },
    { id: 'glb', label: 'GLB', help: 'Web / AR viewer; PBR materials' },
    { id: 'pdf-drawing', label: 'Drawing (PDF)', help: 'Dimensioned A3 engineering drawing' },
];

/**
 * DXF is planar-only. The runtime side fails non-planar input with
 * export.dxf.non-planar; the UI checks first so the action is visibly inert
 * when no planar source exists. GeometryResult has no top-level `kind`, but
 * the lowerer fills faces[*].plane for planar faces — that's the field we key on.
 */
export function hasPlanarSource(geometries: readonly Pick<GeometryResult, 'faces'>[]): boolean {
    return geometries.some((g) => Array.isArray(g.faces) && g.faces.some((f) => f.plane !== undefined));
}
