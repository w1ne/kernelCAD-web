// src/agent/shopcheck/ruleEngine.ts
//
// Slice E rule engine — generic dispatcher over a DfmRule list. The engine
// never branches on vendor identity; the vendor is a data-lookup key.
//
// Engine flow:
//   1. Filter rules whose appliesTo matches (service, material, thicknessIn).
//   2. Dispatch each surviving rule by scope, evaluate check.kind against
//      the measurement bundle, emit a Finding on violation.
//   3. Findings carry both location: Vec2 and ref: @kc[...] so the agent
//      can repair-in-place via resolve_topo_ref + set_param_value.

import type { DiagnosticCode } from '../../shared/diagnostics/registry';
import { DIAGNOSTIC_REGISTRY } from '../../shared/diagnostics/registry';
import type {
  DfmRule, MeasurementBundle, VendorContext, Finding, RepairAction, FindingMeasured,
} from './types';

export function evaluateRules(
  bundle: MeasurementBundle,
  rules: ReadonlyArray<DfmRule>,
  ctx: VendorContext,
): Finding[] {
  const findings: Finding[] = [];
  for (const rule of rules) {
    if (!ruleApplies(rule, ctx)) continue;
    switch (rule.scope) {
      case 'hole':       findings.push(...checkHoles(rule, bundle, ctx)); break;
      case 'slot':       findings.push(...checkSlots(rule, bundle, ctx)); break;
      case 'web':        findings.push(...checkWebs(rule, bundle, ctx)); break;
      case 'bend':       findings.push(...checkBends(rule, bundle, ctx)); break;
      case 'flange':     findings.push(...checkFlanges(rule, bundle, ctx)); break;
      case 'sheet-size': findings.push(...checkSheetSize(rule, bundle, ctx)); break;
      case 'thickness':  findings.push(...checkThickness(rule, bundle, ctx)); break;
      case 'material':   findings.push(...checkMaterial(rule, bundle, ctx)); break;
      case 'units':      /* DXF-input-only; handled in parseDxfInput. */ break;
      case 'input':      /* MCP-input-only; handled at the tool boundary. */ break;
    }
  }
  return findings;
}

function ruleApplies(rule: DfmRule, ctx: VendorContext): boolean {
  if (rule.appliesTo.services && !rule.appliesTo.services.includes(ctx.service)) return false;
  if (rule.appliesTo.materials && !rule.appliesTo.materials.some(m => matches(m, ctx.materialSku))) return false;
  if (rule.appliesTo.thicknessRangeIn) {
    const [min, max] = rule.appliesTo.thicknessRangeIn;
    if (ctx.thicknessIn < min || ctx.thicknessIn > max) return false;
  }
  return true;
}
function matches(pattern: string, sku: string): boolean {
  if (pattern === '*' || pattern === sku) return true;
  if (pattern.endsWith('*')) return sku.startsWith(pattern.slice(0, -1));
  return false;
}

function thresholdValue(
  rule: DfmRule,
  ctx: VendorContext,
): { value: number; unit: 'mm' | 'in' } | null {
  if (rule.check.kind !== 'min' && rule.check.kind !== 'max') return null;
  const t = rule.check.threshold;
  if (typeof t === 'number') {
    if (rule.check.units === 'multiplier-of-thickness') {
      return { value: t * ctx.thicknessMm, unit: 'mm' };
    }
    return { value: t, unit: rule.check.units };
  }
  const perMat = t.perMaterial[ctx.materialSku] ?? t.perMaterial['*'];
  if (perMat === undefined) return null;
  if (rule.check.units === 'multiplier-of-thickness') {
    return { value: perMat * ctx.thicknessMm, unit: 'mm' };
  }
  return { value: perMat, unit: rule.check.units };
}

function toMm(value: number, unit: 'mm' | 'in'): number {
  return unit === 'in' ? value * 25.4 : value;
}

function checkHoles(rule: DfmRule, b: MeasurementBundle, ctx: VendorContext): Finding[] {
  const out: Finding[] = [];
  const th = thresholdValue(rule, ctx);
  if (!th) {
    out.push(makeFinding('dfm.rule.threshold-unknown', 'warn', rule));
    return out;
  }
  const thMm = toMm(th.value, th.unit);
  for (const hole of b.holes) {
    if (rule.check.kind === 'min' && hole.diameter < thMm) {
      out.push(makeFinding(
        rule.diagnosticCode,
        rule.severity,
        rule,
        { kind: 'hole', value: hole.diameter, unit: 'mm', location: hole.center, ref: hole.ref },
        { value: thMm, unit: 'mm' },
      ));
    }
  }
  return out;
}

function checkSlots(rule: DfmRule, b: MeasurementBundle, ctx: VendorContext): Finding[] {
  const out: Finding[] = [];
  const th = thresholdValue(rule, ctx);
  if (!th) {
    out.push(makeFinding('dfm.rule.threshold-unknown', 'warn', rule));
    return out;
  }
  const thMm = toMm(th.value, th.unit);
  for (const slot of b.slots) {
    if (rule.check.kind === 'min' && slot.width < thMm) {
      out.push(makeFinding(
        rule.diagnosticCode,
        rule.severity,
        rule,
        { kind: 'slot', value: slot.width, unit: 'mm', location: slot.center, ref: slot.ref },
        { value: thMm, unit: 'mm' },
      ));
    }
  }
  return out;
}

function checkWebs(rule: DfmRule, b: MeasurementBundle, ctx: VendorContext): Finding[] {
  const out: Finding[] = [];
  const th = thresholdValue(rule, ctx);
  if (!th) {
    out.push(makeFinding('dfm.rule.threshold-unknown', 'warn', rule));
    return out;
  }
  const thMm = toMm(th.value, th.unit);
  for (const w of b.webs) {
    if (rule.check.kind === 'min' && w.width < thMm) {
      out.push(makeFinding(
        rule.diagnosticCode,
        rule.severity,
        rule,
        { kind: 'web', value: w.width, unit: 'mm', location: w.location, ref: w.ref },
        { value: thMm, unit: 'mm' },
      ));
    }
  }
  return out;
}

function checkBends(rule: DfmRule, b: MeasurementBundle, ctx: VendorContext): Finding[] {
  const out: Finding[] = [];
  for (const bend of b.bends) {
    if (rule.id.includes('min-radius')) {
      const th = thresholdValue(rule, ctx);
      if (!th) {
        out.push(makeFinding('dfm.rule.threshold-unknown', 'warn', rule));
        continue;
      }
      const thMm = toMm(th.value, th.unit);
      if (bend.radius < thMm) {
        out.push(makeFinding(
          rule.diagnosticCode, rule.severity, rule,
          { kind: 'bendRadius', value: bend.radius, unit: 'mm', location: bend.axisLocation, ref: bend.ref },
          { value: thMm, unit: 'mm' },
        ));
      }
    } else if (rule.id.includes('max-angle')) {
      const th = thresholdValue(rule, ctx);
      if (th && Math.abs(bend.angle) > th.value) {
        out.push(makeFinding(
          rule.diagnosticCode, rule.severity, rule,
          { kind: 'bendRadius', value: Math.abs(bend.angle), unit: 'mm', location: bend.axisLocation, ref: bend.ref },
          { value: th.value, unit: 'mm' },
        ));
      }
    } else if (rule.id.includes('max-length')) {
      const th = thresholdValue(rule, ctx);
      if (th) {
        const thMm = toMm(th.value, th.unit);
        if (bend.length > thMm) {
          out.push(makeFinding(
            rule.diagnosticCode, rule.severity, rule,
            { kind: 'bendRadius', value: bend.length, unit: 'mm', location: bend.axisLocation, ref: bend.ref },
            { value: thMm, unit: 'mm' },
          ));
        }
      }
    }
  }
  return out;
}

function checkFlanges(rule: DfmRule, b: MeasurementBundle, ctx: VendorContext): Finding[] {
  const out: Finding[] = [];
  const th = thresholdValue(rule, ctx);
  if (!th) return out;
  const thMm = toMm(th.value, th.unit);
  for (const f of b.flanges) {
    if (f.length < thMm) {
      out.push(makeFinding(
        rule.diagnosticCode, rule.severity, rule,
        { kind: 'flange', value: f.length, unit: 'mm', ref: f.ref },
        { value: thMm, unit: 'mm' },
      ));
    }
  }
  return out;
}

function checkSheetSize(rule: DfmRule, b: MeasurementBundle, ctx: VendorContext): Finding[] {
  const out: Finding[] = [];
  const th = thresholdValue(rule, ctx);
  if (!th) return out;
  const thMm = toMm(th.value, th.unit);
  const dim = Math.max(b.aabb.max[0] - b.aabb.min[0], b.aabb.max[1] - b.aabb.min[1]);
  const hit = rule.check.kind === 'max' ? dim > thMm : dim < thMm;
  if (hit) {
    out.push(makeFinding(
      rule.diagnosticCode, rule.severity, rule,
      { kind: 'sheet-size', value: dim, unit: 'mm', ref: b.partRef },
      { value: thMm, unit: 'mm' },
    ));
  }
  return out;
}

function checkThickness(rule: DfmRule, _b: MeasurementBundle, ctx: VendorContext): Finding[] {
  const out: Finding[] = [];
  if (rule.check.kind === 'expression') {
    // Stocked-gauges check requires the catalog (lives in ctx.specs.skus[sku].thicknessesIn).
    if (rule.check.formula.includes('thicknessIn IN catalog[sku].thicknessesIn')) {
      const skus = (ctx.specs as { skus?: Record<string, { thicknessesIn?: number[] }> }).skus;
      const skuEntry = skus?.[ctx.materialSku];
      if (skuEntry?.thicknessesIn && !skuEntry.thicknessesIn.some(t => Math.abs(t - ctx.thicknessIn) < 1e-6)) {
        out.push(makeFinding(rule.diagnosticCode, rule.severity, rule));
      }
    }
    return out;
  }
  const th = thresholdValue(rule, ctx);
  if (!th) return out;
  if (rule.check.kind === 'min' && ctx.thicknessIn < th.value) {
    out.push(makeFinding(rule.diagnosticCode, rule.severity, rule, undefined, th));
  }
  if (rule.check.kind === 'max' && ctx.thicknessIn > th.value) {
    out.push(makeFinding(rule.diagnosticCode, rule.severity, rule, undefined, th));
  }
  return out;
}

function checkMaterial(rule: DfmRule, _b: MeasurementBundle, ctx: VendorContext): Finding[] {
  if (rule.check.kind === 'enum' && !rule.check.allowed.includes(ctx.materialSku)) {
    return [makeFinding(rule.diagnosticCode, rule.severity, rule)];
  }
  return [];
}

function makeFinding(
  code: DiagnosticCode,
  severity: 'info' | 'warn' | 'error',
  rule: DfmRule,
  measured?: FindingMeasured,
  threshold?: Finding['threshold'],
): Finding {
  const spec = DIAGNOSTIC_REGISTRY[code];
  const finding: Finding = {
    code, severity,
    message: spec.description,
    hint: spec.hintTemplate,
    nextAction: spec.nextAction,
    ruleId: rule.id,
    ruleSource: rule.ruleSource,
  };
  if (measured !== undefined) finding.measured = measured;
  if (threshold !== undefined) finding.threshold = threshold;
  if (severity === 'error' && rule.repairAction !== undefined) {
    finding.repairHint = { action: rule.repairAction, params: paramsForAction(rule.repairAction, measured, threshold) };
  }
  return finding;
}

function paramsForAction(
  action: RepairAction,
  measured: FindingMeasured | undefined,
  threshold: Finding['threshold'],
): Record<string, unknown> {
  if (action === 'enlarge' && measured && threshold) {
    return { from: measured.value, to: threshold.value, unit: threshold.unit, ref: measured.ref };
  }
  if (action === 'change-thickness' && threshold) {
    return { to: threshold.value, unit: threshold.unit };
  }
  if (action === 'change-material') {
    return {};
  }
  if (action === 'relocate' && measured) {
    return { ref: measured.ref };
  }
  if (action === 'remove' && measured) {
    return { ref: measured.ref };
  }
  return {};
}
