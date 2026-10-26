// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

export type StepMatrix4 = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
];

export interface StepComponentColor {
  hex: `#${string}`;
  alpha: number;
}

export interface StepImportDefinition {
  /** Stable identifier derived from the XCAF definition label path. */
  id: string;
  sourceLabel: string;
  name: string;
  brep: Uint8Array;
  brepVersion: string;
  solidCount: number;
  boundsMm: { min: [number, number, number]; max: [number, number, number] };
  volumeMm3: number;
}

export interface StepImportOccurrence {
  id: string;
  name: string;
  /** Original nested XCAF names; never sanitized in the manifest. */
  sourcePath: string[];
  definitionId: string;
  /** Column-major rigid 4x4 transform in canonical millimetres. */
  transform: StepMatrix4;
  color?: StepComponentColor;
}

export interface StepAssemblySnapshot {
  sourceLengthUnits: string[];
  definitions: StepImportDefinition[];
  occurrences: StepImportOccurrence[];
  warnings: string[];
}

export type StepImportFailureReason =
  | 'read'
  | 'empty'
  | 'invalid-solid'
  | 'unsupported-transform'
  | 'metadata';

export class StepAssemblyImportError extends Error {
  readonly reason: StepImportFailureReason;
  readonly sourcePath?: string[];

  constructor(reason: StepImportFailureReason, message: string, sourcePath?: string[]) {
    super(message);
    this.name = 'StepAssemblyImportError';
    this.reason = reason;
    this.sourcePath = sourcePath;
  }
}
