// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A scan is a measured point cloud. It is not a BREP solid.

export const SCAN_DISCLAIMER =
  'Point-cloud reference only, not a BREP solid. Booleans and feature recognition on this scan are refused. mesh_to_features and lib.fromSTL promote a mesh; they do not apply to this cloud.';

/** Stored sample cap. Larger clouds keep a stride sample and set downsampled. */
export const SCAN_POINT_CAP = 200_000;

/** Hard parse limit. Above this the loader refuses instead of buffering the cloud. */
export const SCAN_PARSE_LIMIT = 2_000_000;

export type ScanUnits = 'mm' | 'm' | 'in';

export type ScanFormat = 'ply-ascii' | 'ply-binary-little-endian' | 'xyz';

export type Vec3 = [number, number, number];

export interface ScanBBox {
  min: Vec3;
  max: Vec3;
  size: Vec3;
}

export interface ScanReference {
  ok: true;
  format: ScanFormat;
  pointCount: number;
  bbox: ScanBBox;
  centroid: Vec3;
  units: ScanUnits;
  /** Multiply file coordinates by this to get millimetres. */
  scaleToMm: number;
  downsampled: boolean;
  storedPointCount: number;
  /** Stride sample in millimetres. Present only when the caller asks to keep points. */
  points?: Vec3[];
  disclaimer: string;
}

export interface ScanFailure {
  ok: false;
  errorCode: 'cli.invalid-args';
  error: string;
  disclaimer: string;
}

export type ScanResult = ScanReference | ScanFailure;

export function scanRefused(error: string): ScanFailure {
  return { ok: false, errorCode: 'cli.invalid-args', error, disclaimer: SCAN_DISCLAIMER };
}
