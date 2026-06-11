// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/dfmPreflight.ts
//
// Slice E — vendor-parameterized DFM preflight MCP tool. Public skill:
// kernelcad-shopcheck. The vendor is a runtime parameter (data lookup
// key into catalogs/vendors/<vendor>/), not a code branch.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { flattenPatternTool } from './flattenPattern';
import { getBendTableTool } from './getBendTable';
import { evaluateRules } from '../../shopcheck/ruleEngine';
import { measure } from '../../shopcheck/measure';
import { parseDxfInput } from '../../shopcheck/parseDxfInput';
import { DIAGNOSTIC_REGISTRY } from '../../../shared/diagnostics/registry';
import type { DiagnosticCode } from '../../../shared/diagnostics/registry';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { Region } from '../../../shared/intent/region';
import type {
  DfmService, DfmRule, Finding, VendorContext,
} from '../../shopcheck/types';

const CATALOG_ROOT = 'src/agent/skills/kernelcad-shopcheck/catalogs';

export interface DfmPreflightInput {
  file?: string;
  code?: string;
  dxf?: string;
  featureId?: string;
  vendor?: string;
  material?: string;
  thicknessIn?: number;
  thicknessMm?: number;
  service?: DfmService;
  refreshCatalog?: boolean;
}

export interface DfmPreflightOutput {
  ok: boolean;
  vendor?: string;
  material?: { sku: string; displayName: string; thicknessIn: number; thicknessMm: number };
  service?: DfmService;
  catalogVersion?: string;
  findings: Finding[];
  diagnostics: CompilerDiagnostic[];
  markdownReport?: string;
}

interface CatalogJson {
  schemaVersion: number;
  lastFetched: string;
  sourceSha256: string;
  skus: Record<string, { displayName: string; category: string; thicknessesIn: number[]; services: string[] }>;
}

interface SpecsJson {
  schemaVersion: number;
  lastFetched: string;
  sourceSha256: string;
  skus: Record<string, unknown>;
}

interface RulesJson {
  schemaVersion: number;
  version: string;
  vendor: string;
  rules: DfmRule[];
}

export async function dfmPreflightTool(input: DfmPreflightInput): Promise<DfmPreflightOutput> {
  // Input validation — fail closed on missing required args. All three
  // checks accumulate so the agent sees every gap in a single round-trip.
  const inputDiag: CompilerDiagnostic[] = [];
  if (!input.vendor) inputDiag.push(emit('dfm.input.vendor-required'));
  if (!input.material) inputDiag.push(emit('dfm.input.material-required'));
  if (input.thicknessIn === undefined && input.thicknessMm === undefined) {
    inputDiag.push(emit('dfm.input.thickness-required'));
  }
  if (inputDiag.length > 0) {
    return { ok: false, findings: [], diagnostics: inputDiag };
  }

  // Load vendor data files.
  const vendorDir = join(CATALOG_ROOT, 'vendors', input.vendor as string);
  if (!existsSync(vendorDir)) {
    return {
      ok: false, findings: [], diagnostics: [emit('dfm.material.unknown-sku')],
    };
  }
  const catalog: CatalogJson = JSON.parse(readFileSync(join(vendorDir, 'catalog.json'), 'utf-8'));
  const specs: SpecsJson = JSON.parse(readFileSync(join(vendorDir, 'specs.json'), 'utf-8'));
  const rulesFile: RulesJson = JSON.parse(readFileSync(join(vendorDir, 'rules.json'), 'utf-8'));
  const rules: DfmRule[] = rulesFile.rules;

  const materialSku = input.material as string;
  const matEntry = catalog.skus[materialSku];
  if (!matEntry) {
    return {
      ok: false, findings: [], diagnostics: [emit('dfm.material.unknown-sku')],
    };
  }
  const thicknessIn = input.thicknessIn ?? (input.thicknessMm as number) / 25.4;
  const thicknessMm = input.thicknessMm ?? (input.thicknessIn as number) * 25.4;
  const service: DfmService = input.service ?? inferService(matEntry);

  // Branch on geometry source: .kcad.ts file/code vs DXF path.
  let region: Region;
  let bendThicknessMm = thicknessMm;
  let bendKFactor = 0.38;
  let bends: Array<{ ordinal: number; featureId: string; angle: number; radius: number; bendAllowance: number; axisOrigin: [number, number, number]; axisDirection: [number, number, number] }> = [];
  let pipelineDiagnostics: CompilerDiagnostic[] = [];
  let parsedDxfFindings: Finding[] = [];

  if (input.dxf) {
    const parsed = parseDxfInput(input.dxf);
    parsedDxfFindings = parsed.findings;
    if (!parsed.region) {
      // Unrecoverable DXF (no cut polylines) — surface findings as the
      // failure mode and return early.
      return {
        ok: false,
        findings: parsed.findings,
        diagnostics: parsed.findings.map(findingToDiagnostic),
      };
    }
    region = parsed.region;
    // DXF carries no thickness metadata in the contract; use input.
    bendThicknessMm = thicknessMm;
    bendKFactor = 0.38;
    bends = [];
  } else if (input.file || input.code) {
    const fp = await flattenPatternTool({ file: input.file, code: input.code, featureId: input.featureId });
    if (!fp.ok || !fp.region) {
      return { ok: false, findings: [], diagnostics: fp.diagnostics };
    }
    const bt = await getBendTableTool({ file: input.file, code: input.code });
    region = {
      plane: fp.region.plane,
      outer: fp.region.outer,
      holes: fp.region.holes,
      bendLines: fp.region.bendLines,
    };
    if (bt.rootSheetMetal !== undefined) {
      bendThicknessMm = bt.rootSheetMetal.thickness;
      bendKFactor = bt.rootSheetMetal.kFactor;
    }
    bends = bt.bends.slice();
    pipelineDiagnostics = [...fp.diagnostics, ...bt.diagnostics];
  } else {
    return {
      ok: false, findings: [],
      diagnostics: [emit('dfm.input.vendor-required')], // never reached given input validation above; keeps TS happy
    };
  }

  const ownerPart = input.featureId ?? 'shape';
  const bundle = measure(
    region,
    { thickness: bendThicknessMm, kFactor: bendKFactor, bends },
    ownerPart,
  );

  const ctx: VendorContext = {
    vendor: input.vendor as string,
    materialSku,
    thicknessMm, thicknessIn, service,
    specs: { skus: specs.skus },
  };

  const engineFindings = evaluateRules(bundle, rules, ctx);
  const findings = [...parsedDxfFindings, ...engineFindings];

  return {
    ok: !findings.some(f => f.severity === 'error'),
    vendor: input.vendor,
    material: { sku: materialSku, displayName: matEntry.displayName, thicknessIn, thicknessMm },
    service,
    catalogVersion: catalog.lastFetched,
    findings,
    diagnostics: [
      ...pipelineDiagnostics,
      ...findings.map(findingToDiagnostic),
    ],
  };
}

function inferService(matEntry: { services?: string[] }): DfmService {
  if (matEntry.services?.includes('laser')) return 'laser';
  if (matEntry.services?.includes('cnc-router')) return 'cnc-router';
  if (matEntry.services?.includes('waterjet')) return 'waterjet';
  return 'laser';
}

function emit(code: DiagnosticCode): CompilerDiagnostic {
  const spec = DIAGNOSTIC_REGISTRY[code];
  return {
    target: 'export-occt',
    code, severity: spec.defaultSeverity,
    message: spec.description, hint: spec.hintTemplate, nextAction: spec.nextAction,
  };
}

function findingToDiagnostic(f: Finding): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code: f.code, severity: f.severity,
    message: f.message, hint: f.hint, nextAction: f.nextAction,
  };
}
