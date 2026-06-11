// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/shopcheck/types.ts
//
// Slice E DFM preflight — shared types for the rule engine, measurement
// pipeline, and dfm_preflight MCP tool. The vendor-parameterized API
// takes its rule set as data; the engine here is generic.

import type { Vec2 } from '../../shared/intent/region';
import type { DiagnosticCode } from '../../shared/diagnostics/registry';
import type { NextAction } from '../../shared/diagnostics/nextAction';

export type DfmService = 'laser' | 'cnc-router' | 'waterjet' | 'bending';

export type RepairAction =
  | 'enlarge'
  | 'remove'
  | 'relocate'
  | 'change-material'
  | 'change-thickness';

export type DfmRuleScope =
  | 'hole' | 'slot' | 'web' | 'bend' | 'flange'
  | 'sheet-size' | 'thickness' | 'material' | 'units' | 'input';

export type DfmRuleCheck =
  | { kind: 'min'; threshold: number | { perMaterial: Record<string, number> }; units: 'in' | 'mm' | 'multiplier-of-thickness' }
  | { kind: 'max'; threshold: number | { perMaterial: Record<string, number> }; units: 'in' | 'mm' | 'multiplier-of-thickness' }
  | { kind: 'enum'; allowed: ReadonlyArray<string> }
  | { kind: 'expression'; formula: string };

export interface DfmRule {
  id: string;
  description: string;
  scope: DfmRuleScope;
  appliesTo: {
    services?: ReadonlyArray<DfmService>;
    materials?: ReadonlyArray<string>;
    thicknessRangeIn?: [number, number];
  };
  check: DfmRuleCheck;
  diagnosticCode: DiagnosticCode;
  severity: 'info' | 'warn' | 'error';
  repairAction?: RepairAction;
  ruleSource: string;
}

export interface HoleMeasurement {
  diameter: number;
  center: Vec2;
  ordinal: number;
  ref: string;
}
export interface SlotMeasurement {
  width: number; length: number;
  center: Vec2; ordinal: number;
  ref: string;
}
export interface WebMeasurement {
  width: number; location: Vec2;
  ref: string;
}
export interface FlangeMeasurement {
  side: 'before' | 'after';
  length: number;
  bendOrdinal: number;
  ref: string;
}
export interface BendMeasurement {
  ordinal: number;
  angle: number; radius: number; length: number;
  axisLocation: Vec2;
  ref: string;
}

export interface MeasurementBundle {
  holes: HoleMeasurement[];
  slots: SlotMeasurement[];
  webs: WebMeasurement[];
  flanges: FlangeMeasurement[];
  bends: BendMeasurement[];
  aabb: { min: Vec2; max: Vec2 };
  partRef: string;
}

export interface VendorContext {
  vendor: string;
  materialSku: string;
  thicknessMm: number;
  thicknessIn: number;
  service: DfmService;
  specs: Record<string, unknown>;
}

export interface FindingMeasured {
  kind: 'hole' | 'slot' | 'web' | 'bendRadius' | 'flange' | 'sheet-size';
  value: number;
  unit: 'mm' | 'in';
  location?: Vec2;
  ref?: string;
}

export interface Finding {
  code: DiagnosticCode;
  severity: 'info' | 'warn' | 'error';
  message: string;
  hint: string;
  nextAction: NextAction;
  ruleId: string;
  ruleSource: string;
  measured?: FindingMeasured;
  threshold?: { value: number; unit: 'mm' | 'in' };
  repairHint?: { action: RepairAction; params: Record<string, unknown> };
}
