// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
export interface FastenerStation {
  part: string;
  against: readonly string[];
  engagementPart?: string;
  /** Declared geometric overlap limit; no strength or thread-contact claim. */
  minEngagementMm?: number;
  maxProtrusionMm?: number;
}
export interface FastenerInstallationOptions {
  assembly?: string;
  fasteners: readonly FastenerStation[];
  toleranceMm?: number;
  angleToleranceDeg?: number;
}
export type InstallationMetricStatus = 'pass' | 'fail' | 'unknown' | 'not-applicable';
export interface InstallationMetric {
  name: string;
  part: string | null;
  status: InstallationMetricStatus;
  value: number | null;
  unit: 'mm' | 'deg';
  limit: number | null;
  basis: string;
  repairHint: string | null;
}
export interface FastenerStationReport {
  part: string;
  against: readonly string[];
  engagementPart: string | null;
  catalogId: string | null;
  status: 'pass' | 'fail' | 'partial';
  metrics: InstallationMetric[];
}
export interface FastenerInstallationReport {
  ok: boolean;
  source: 'local';
  assembly: string | null;
  status: 'pass' | 'fail' | 'partial' | 'no-coverage';
  counts: { requested: number; measured: number; passed: number; failed: number; unknown: number };
  stations: FastenerStationReport[];
  limitations: readonly string[];
}
