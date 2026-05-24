import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { evaluateRules } from '../../../src/agent/shopcheck/ruleEngine';
import type { DfmRule, MeasurementBundle, VendorContext } from '../../../src/agent/shopcheck/types';

function ctx(overrides: Partial<VendorContext> = {}): VendorContext {
  return {
    vendor: 'sendcutsend',
    materialSku: 'aluminum-6061-t6',
    thicknessMm: 3.175, thicknessIn: 0.125,
    service: 'laser',
    specs: {
      skus: {
        'aluminum-6061-t6': {
          thicknessesIn: [0.125, 0.25, 0.5],
          minHoleIn: { '0.125': 0.0625 },
          minSlotIn: { '0.125': 0.063 },
          minBendRadiusIn: { '0.125': 0.094 },
          bendable: true,
        },
      },
    },
    ...overrides,
  };
}

function emptyBundle(overrides: Partial<MeasurementBundle> = {}): MeasurementBundle {
  return {
    holes: [], slots: [], webs: [], flanges: [], bends: [],
    aabb: { min: [0, 0], max: [40, 30] },
    partRef: '@kc[bracket]',
    ...overrides,
  };
}

describe('rule engine — min-hole rules (scs.laser.min-hole-50pct-thickness)', () => {
  const rule: DfmRule = {
    id: 'scs.laser.min-hole-50pct-thickness',
    description: 'min hole = 50% of thickness',
    scope: 'hole',
    appliesTo: { services: ['laser'] },
    check: { kind: 'min', threshold: 0.5, units: 'multiplier-of-thickness' },
    diagnosticCode: 'dfm.hole.below-minimum',
    severity: 'error',
    repairAction: 'enlarge',
    ruleSource: '/laser-cutting/',
  };

  it('fires dfm.hole.below-minimum when diameter < 0.5 * thickness', () => {
    const bundle = emptyBundle({ holes: [{ diameter: 1.0, center: [10, 10], ordinal: 0, ref: '@kc[bracket/face/top/hole/0]' }] });
    const findings = evaluateRules(bundle, [rule], ctx());
    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe('dfm.hole.below-minimum');
    expect(findings[0].measured?.ref).toBe('@kc[bracket/face/top/hole/0]');
    expect(findings[0].repairHint?.action).toBe('enlarge');
  });

  it('does NOT fire when diameter >= 0.5 * thickness', () => {
    const bundle = emptyBundle({ holes: [{ diameter: 2.0, center: [10, 10], ordinal: 0, ref: '@kc[bracket/face/top/hole/0]' }] });
    const findings = evaluateRules(bundle, [rule], ctx());
    expect(findings).toHaveLength(0);
  });
});

describe('rule engine — min-hole rules (per-material)', () => {
  const rule: DfmRule = {
    id: 'scs.laser.min-hole-per-material',
    description: 'per-material min hole',
    scope: 'hole',
    appliesTo: { services: ['laser'] },
    check: { kind: 'min', threshold: { perMaterial: { 'aluminum-6061-t6': 0.0625 } }, units: 'in' },
    diagnosticCode: 'dfm.hole.below-minimum',
    severity: 'error',
    repairAction: 'enlarge',
    ruleSource: 'specs.json',
  };

  it('fires when diameter below per-material threshold', () => {
    const bundle = emptyBundle({ holes: [{ diameter: 1.0, center: [10, 10], ordinal: 0, ref: '@kc[bracket/face/top/hole/0]' }] });
    const findings = evaluateRules(bundle, [rule], ctx());
    expect(findings).toHaveLength(1);
  });

  it('does NOT fire when diameter meets per-material threshold', () => {
    const bundle = emptyBundle({ holes: [{ diameter: 3.0, center: [10, 10], ordinal: 0, ref: '@kc[bracket/face/top/hole/0]' }] });
    const findings = evaluateRules(bundle, [rule], ctx());
    expect(findings).toHaveLength(0);
  });

  it('emits dfm.rule.threshold-unknown for off-catalog material', () => {
    const bundle = emptyBundle({ holes: [{ diameter: 1.0, center: [10, 10], ordinal: 0, ref: '@kc[bracket/face/top/hole/0]' }] });
    const findings = evaluateRules(bundle, [rule], ctx({ materialSku: 'titanium' }));
    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe('dfm.rule.threshold-unknown');
  });
});

describe('rule engine — min-slot-width rules', () => {
  const rule: DfmRule = {
    id: 'scs.laser.min-slot-width',
    description: 'min slot width',
    scope: 'slot',
    appliesTo: { services: ['laser'] },
    check: { kind: 'min', threshold: { perMaterial: { 'aluminum-6061-t6': 0.063 } }, units: 'in' },
    diagnosticCode: 'dfm.slot.below-minimum',
    severity: 'error',
    repairAction: 'enlarge',
    ruleSource: 'specs.json',
  };

  it('fires when slot width below threshold', () => {
    const bundle = emptyBundle({ slots: [{ width: 1.0, length: 20, center: [10, 10], ordinal: 0, ref: '@kc[bracket/face/top/slot/0]' }] });
    const findings = evaluateRules(bundle, [rule], ctx());
    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe('dfm.slot.below-minimum');
  });

  it('does NOT fire when slot width above threshold', () => {
    const bundle = emptyBundle({ slots: [{ width: 5.0, length: 20, center: [10, 10], ordinal: 0, ref: '@kc[bracket/face/top/slot/0]' }] });
    const findings = evaluateRules(bundle, [rule], ctx());
    expect(findings).toHaveLength(0);
  });
});

describe('rule engine — min-web-width rules', () => {
  const rule: DfmRule = {
    id: 'scs.laser.min-web-width',
    description: 'min bridge width between cutouts',
    scope: 'web',
    appliesTo: { services: ['laser'] },
    check: { kind: 'min', threshold: { perMaterial: { 'aluminum-6061-t6': 0.060 } }, units: 'in' },
    diagnosticCode: 'dfm.web.below-minimum',
    severity: 'error',
    repairAction: 'relocate',
    ruleSource: 'specs.json',
  };

  it('fires when web width below threshold', () => {
    const bundle = emptyBundle({ webs: [{ width: 0.5, location: [10, 10], ref: '@kc[bracket/face/top/web/0]' }] });
    const findings = evaluateRules(bundle, [rule], ctx());
    expect(findings).toHaveLength(1);
    expect(findings[0].repairHint?.action).toBe('relocate');
  });

  it('does NOT fire when web width above threshold', () => {
    const bundle = emptyBundle({ webs: [{ width: 5.0, location: [10, 10], ref: '@kc[bracket/face/top/web/0]' }] });
    const findings = evaluateRules(bundle, [rule], ctx());
    expect(findings).toHaveLength(0);
  });
});

describe('rule engine — min-bend-radius rules', () => {
  const rule: DfmRule = {
    id: 'scs.bending.min-radius-per-thickness',
    description: 'per-material min bend radius',
    scope: 'bend',
    appliesTo: { services: ['bending'] },
    check: { kind: 'min', threshold: { perMaterial: { 'aluminum-6061-t6': 2.4 } }, units: 'mm' },
    diagnosticCode: 'dfm.bend.radius-below-minimum',
    severity: 'error',
    repairAction: 'enlarge',
    ruleSource: 'specs.json',
  };

  it('fires when radius < per-material minimum', () => {
    const bundle = emptyBundle({
      bends: [{ ordinal: 0, angle: 90, radius: 1.0, length: 50, axisLocation: [25, 0], ref: '@kc[bracket/face/bend/0]' }],
    });
    const findings = evaluateRules(bundle, [rule], ctx({ service: 'bending' }));
    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe('dfm.bend.radius-below-minimum');
    expect(findings[0].measured?.ref).toBe('@kc[bracket/face/bend/0]');
  });

  it('does NOT fire when radius meets the per-material minimum', () => {
    const bundle = emptyBundle({
      bends: [{ ordinal: 0, angle: 90, radius: 3.0, length: 50, axisLocation: [25, 0], ref: '@kc[bracket/face/bend/0]' }],
    });
    const findings = evaluateRules(bundle, [rule], ctx({ service: 'bending' }));
    expect(findings).toHaveLength(0);
  });
});

describe('rule engine — max-bend-angle rules', () => {
  const rule: DfmRule = {
    id: 'scs.bending.max-angle',
    description: '|angle| <= 130 deg',
    scope: 'bend',
    appliesTo: { services: ['bending'] },
    check: { kind: 'max', threshold: 130, units: 'mm' },
    diagnosticCode: 'dfm.bend.angle-too-acute',
    severity: 'error',
    repairAction: 'enlarge',
    ruleSource: '/bending/',
  };

  it('fires when |angle| > 130', () => {
    const bundle = emptyBundle({
      bends: [{ ordinal: 0, angle: 150, radius: 3.0, length: 50, axisLocation: [25, 0], ref: '@kc[bracket/face/bend/0]' }],
    });
    const findings = evaluateRules(bundle, [rule], ctx({ service: 'bending' }));
    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe('dfm.bend.angle-too-acute');
  });

  it('does NOT fire when |angle| <= 130', () => {
    const bundle = emptyBundle({
      bends: [{ ordinal: 0, angle: 90, radius: 3.0, length: 50, axisLocation: [25, 0], ref: '@kc[bracket/face/bend/0]' }],
    });
    const findings = evaluateRules(bundle, [rule], ctx({ service: 'bending' }));
    expect(findings).toHaveLength(0);
  });
});

describe('rule engine — max-bend-length rules', () => {
  const rule: DfmRule = {
    id: 'scs.bending.max-length',
    description: 'bend length <= 44 in',
    scope: 'bend',
    appliesTo: { services: ['bending'] },
    check: { kind: 'max', threshold: 44, units: 'in' },
    diagnosticCode: 'dfm.bend.length-exceeds-max',
    severity: 'warn',
    ruleSource: '/bending/',
  };

  it('fires when bend length > 44 in (1117 mm)', () => {
    const bundle = emptyBundle({
      bends: [{ ordinal: 0, angle: 90, radius: 3.0, length: 1200, axisLocation: [25, 0], ref: '@kc[bracket/face/bend/0]' }],
    });
    const findings = evaluateRules(bundle, [rule], ctx({ service: 'bending' }));
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('warn');
  });

  it('does NOT fire when bend length within envelope', () => {
    const bundle = emptyBundle({
      bends: [{ ordinal: 0, angle: 90, radius: 3.0, length: 100, axisLocation: [25, 0], ref: '@kc[bracket/face/bend/0]' }],
    });
    const findings = evaluateRules(bundle, [rule], ctx({ service: 'bending' }));
    expect(findings).toHaveLength(0);
  });
});

describe('rule engine — sheet-size rules', () => {
  const rule: DfmRule = {
    id: 'scs.size.max-instant-quote',
    description: '<= 44 in',
    scope: 'sheet-size',
    appliesTo: { services: ['laser', 'cnc-router', 'waterjet'] },
    check: { kind: 'max', threshold: { perMaterial: { '*': 44 } }, units: 'in' },
    diagnosticCode: 'dfm.size.exceeds-instant-quote',
    severity: 'warn',
    ruleSource: '/materials/min-max/',
  };

  it('fires warn-level when AABB exceeds the envelope', () => {
    const bundle = emptyBundle({ aabb: { min: [0, 0], max: [1500, 100] } });
    const findings = evaluateRules(bundle, [rule], ctx());
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('warn');
  });

  it('does NOT fire when AABB fits in the envelope', () => {
    const bundle = emptyBundle({ aabb: { min: [0, 0], max: [200, 150] } });
    const findings = evaluateRules(bundle, [rule], ctx());
    expect(findings).toHaveLength(0);
  });
});

describe('rule engine — min-part-size rules', () => {
  const rule: DfmRule = {
    id: 'scs.size.min-part-size',
    description: '>= category minimum',
    scope: 'sheet-size',
    appliesTo: {},
    check: { kind: 'min', threshold: { perMaterial: { '*': 0.25 } }, units: 'in' },
    diagnosticCode: 'dfm.size.below-minimum',
    severity: 'error',
    repairAction: 'enlarge',
    ruleSource: '/materials/min-max/',
  };

  it('fires when AABB max-dim below threshold', () => {
    const bundle = emptyBundle({ aabb: { min: [0, 0], max: [3, 3] } });
    const findings = evaluateRules(bundle, [rule], ctx());
    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe('dfm.size.below-minimum');
  });

  it('does NOT fire when AABB max-dim above threshold', () => {
    const bundle = emptyBundle({ aabb: { min: [0, 0], max: [200, 150] } });
    const findings = evaluateRules(bundle, [rule], ctx());
    expect(findings).toHaveLength(0);
  });
});

describe('rule engine — material catalog rules', () => {
  const rule: DfmRule = {
    id: 'scs.material.sku-in-catalog',
    description: 'material SKU must be in catalog',
    scope: 'material',
    appliesTo: {},
    check: { kind: 'enum', allowed: ['aluminum-6061-t6', 'mild-steel-1018'] },
    diagnosticCode: 'dfm.material.unknown-sku',
    severity: 'error',
    repairAction: 'change-material',
    ruleSource: 'catalog.json',
  };

  it('fires dfm.material.unknown-sku for an off-catalog material', () => {
    const findings = evaluateRules(emptyBundle(), [rule], ctx({ materialSku: 'unobtanium' }));
    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe('dfm.material.unknown-sku');
  });

  it('does NOT fire for an in-catalog material', () => {
    const findings = evaluateRules(emptyBundle(), [rule], ctx({ materialSku: 'aluminum-6061-t6' }));
    expect(findings).toHaveLength(0);
  });
});

describe('rule engine — bending material-supported rules', () => {
  const rule: DfmRule = {
    id: 'scs.bending.material-supported',
    description: 'material is bendable',
    scope: 'material',
    appliesTo: { services: ['bending'] },
    check: { kind: 'enum', allowed: ['aluminum-6061-t6', 'mild-steel-1018'] },
    diagnosticCode: 'dfm.bending.material-unsupported',
    severity: 'error',
    repairAction: 'change-material',
    ruleSource: '/bending/',
  };

  it('fires when bending a non-bendable material', () => {
    const findings = evaluateRules(emptyBundle(), [rule], ctx({ service: 'bending', materialSku: 'acrylic-cast' }));
    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe('dfm.bending.material-unsupported');
  });

  it('does NOT fire when bending a bendable material', () => {
    const findings = evaluateRules(emptyBundle(), [rule], ctx({ service: 'bending', materialSku: 'aluminum-6061-t6' }));
    expect(findings).toHaveLength(0);
  });

  it('does not fire when service !== bending (appliesTo gate)', () => {
    const findings = evaluateRules(emptyBundle(), [rule], ctx({ service: 'laser', materialSku: 'acrylic-cast' }));
    expect(findings).toHaveLength(0);
  });
});

describe('rule engine — thickness range rules', () => {
  const rule: DfmRule = {
    id: 'scs.bending.thickness-range',
    description: 'bending thickness 0.030-0.250 in',
    scope: 'thickness',
    appliesTo: { services: ['bending'] },
    check: { kind: 'max', threshold: 0.250, units: 'in' },
    diagnosticCode: 'dfm.thickness.out-of-range-for-service',
    severity: 'error',
    repairAction: 'change-thickness',
    ruleSource: '/bending/',
  };

  it('fires when thickness > 0.250 in for bending', () => {
    const findings = evaluateRules(emptyBundle(), [rule], ctx({ service: 'bending', thicknessIn: 0.500 }));
    expect(findings).toHaveLength(1);
  });

  it('does NOT fire when within envelope', () => {
    const findings = evaluateRules(emptyBundle(), [rule], ctx({ service: 'bending', thicknessIn: 0.125 }));
    expect(findings).toHaveLength(0);
  });
});

describe('rule engine — thickness in stocked gauges', () => {
  const rule: DfmRule = {
    id: 'scs.thickness.in-stocked-gauges',
    description: 'thickness in stocked gauges',
    scope: 'thickness',
    appliesTo: {},
    check: { kind: 'expression', formula: 'thicknessIn IN catalog[sku].thicknessesIn' },
    diagnosticCode: 'dfm.thickness.not-stocked',
    severity: 'error',
    repairAction: 'change-thickness',
    ruleSource: 'catalog.json',
  };

  it('fires when thickness not in catalog stocked list', () => {
    const findings = evaluateRules(emptyBundle(), [rule], ctx({ thicknessIn: 0.333 }));
    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe('dfm.thickness.not-stocked');
  });

  it('does NOT fire when thickness in catalog stocked list', () => {
    const findings = evaluateRules(emptyBundle(), [rule], ctx({ thicknessIn: 0.125 }));
    expect(findings).toHaveLength(0);
  });
});

describe('rule engine — min-flange rules', () => {
  const rule: DfmRule = {
    id: 'scs.bending.flange-before-bend',
    description: 'min flange before bend',
    scope: 'flange',
    appliesTo: { services: ['bending'] },
    check: { kind: 'min', threshold: { perMaterial: { 'aluminum-6061-t6': 0.500 } }, units: 'in' },
    diagnosticCode: 'dfm.bend.flange-too-short',
    severity: 'error',
    repairAction: 'enlarge',
    ruleSource: 'specs.json',
  };

  it('fires when flange below per-material minimum', () => {
    const bundle = emptyBundle({
      flanges: [{ side: 'before', length: 5.0, bendOrdinal: 0, ref: '@kc[bracket/face/bend/0/flange/before]' }],
    });
    const findings = evaluateRules(bundle, [rule], ctx({ service: 'bending' }));
    expect(findings).toHaveLength(1);
  });

  it('does NOT fire when flange above minimum', () => {
    const bundle = emptyBundle({
      flanges: [{ side: 'before', length: 50.0, bendOrdinal: 0, ref: '@kc[bracket/face/bend/0/flange/before]' }],
    });
    const findings = evaluateRules(bundle, [rule], ctx({ service: 'bending' }));
    expect(findings).toHaveLength(0);
  });
});

describe('rule engine — vendor extensibility', () => {
  it('does not contain any vendor-string conditional in the engine code path', () => {
    const src = readFileSync('src/agent/shopcheck/ruleEngine.ts', 'utf-8');
    expect(src).not.toMatch(/===\s*['"]sendcutsend['"]/);
    expect(src).not.toMatch(/vendor\s*===\s*['"]/);
  });
});
