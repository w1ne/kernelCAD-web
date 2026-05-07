import type { Assembly } from '../capture/assembly';
import type { Shape } from '../capture/proxy';
import { KernelError } from '../intent/kernelError';

type Vec3 = [number, number, number];

export interface RobotArmScrewPattern {
  x: number;
  y: number;
  diameter: number;
}

export interface RobotArmJointLimits {
  base?: [number, number];
  shoulder?: [number, number];
  elbow?: [number, number];
  wrist?: [number, number];
}

export interface RobotArmKitIntent {
  name?: string;
  linkLengths?: [number, number, number];
  plateThickness?: number;
  linkWidth?: number;
  pivotDiameter?: number;
  clearance?: number;
  basePlate?: [number, number];
  screwPattern?: RobotArmScrewPattern;
  jointLimitsDeg?: RobotArmJointLimits;
}

export interface RobotArmValidation {
  severity: 'info' | 'warning' | 'error';
  code: string;
  message: string;
  hint?: string;
}

export interface RobotArmKitPart {
  name: string;
  role: string;
  quantity: number;
  exportFile: string;
  shape: Shape;
}

export interface RobotArmKitManifestPart {
  name: string;
  role: string;
  quantity: number;
  exportFile: string;
  sourceFile?: string;
}

export interface RobotArmKitManifestJoint {
  name: 'base-yaw' | 'shoulder-pitch' | 'elbow-pitch' | 'wrist-pitch';
  type: 'revolute';
  connects: [string, string];
  axis: Vec3;
  origin: Vec3;
  limitsDeg: [number, number];
}

export interface RobotArmKitManifest {
  kind: 'robot-arm-kit';
  name: string;
  generatedSource: 'robotArmKit(intent).model()';
  intent: RequiredRobotArmKitIntent;
  parts: RobotArmKitManifestPart[];
  joints: RobotArmKitManifestJoint[];
  hardware: {
    pivotDiameter: number;
    clearance: number;
    screwPattern: RobotArmScrewPattern;
  };
  validations: RobotArmValidation[];
}

export interface RobotArmKitPackageFile {
  path: string;
  contents: string;
  mediaType: 'application/json' | 'text/x.kernelcad-typescript';
}

export interface RobotArmKitExportPackage {
  manifestFile: 'manifest.json';
  files: RobotArmKitPackageFile[];
}

interface RequiredRobotArmKitIntent {
  name: string;
  linkLengths: [number, number, number];
  plateThickness: number;
  linkWidth: number;
  pivotDiameter: number;
  clearance: number;
  basePlate: [number, number];
  screwPattern: RobotArmScrewPattern;
  jointLimitsDeg: Required<RobotArmJointLimits>;
}

interface RobotArmKitApi {
  box(x: number, y: number, z: number, centered?: boolean): Shape;
  cylinder(h: number, r: number): Shape;
  union(...shapes: Shape[]): Shape;
  assembly(name?: string): Assembly;
}

export class RobotArmKitDesign {
  private readonly api: RobotArmKitApi;
  private readonly normalizedIntent: RequiredRobotArmKitIntent;
  private readonly validationResults: RobotArmValidation[];
  private cachedParts?: RobotArmKitPart[];
  private cachedModel?: Shape;

  constructor(
    api: RobotArmKitApi,
    normalizedIntent: RequiredRobotArmKitIntent,
    validationResults: RobotArmValidation[],
  ) {
    this.api = api;
    this.normalizedIntent = normalizedIntent;
    this.validationResults = validationResults;
  }

  validations(): RobotArmValidation[] {
    return [...this.validationResults];
  }

  parts(): RobotArmKitPart[] {
    if (this.cachedParts) return this.cachedParts;

    const intent = this.normalizedIntent;
    const [baseX, baseY] = intent.basePlate;
    const [shoulderLength, elbowLength, wristLength] = intent.linkLengths;
    const t = intent.plateThickness;
    const width = intent.linkWidth;
    const pivotRadius = intent.pivotDiameter / 2;
    const screw = intent.screwPattern;

    const basePlate = this.api.box(baseX, baseY, t)
      .holes('top', {
        positions: [
          { u: -screw.x / 2, v: -screw.y / 2 },
          { u: screw.x / 2, v: -screw.y / 2 },
          { u: -screw.x / 2, v: screw.y / 2 },
          { u: screw.x / 2, v: screw.y / 2 },
        ],
        diameter: screw.diameter,
        depth: 'through',
        name: 'baseServoMounts',
      })
      .hole('top', {
        u: 0,
        v: 0,
        diameter: intent.pivotDiameter,
        depth: 'through',
        name: 'basePivot',
      });

    const shoulderLink = linkPlate(this.api, shoulderLength, width, t, intent.pivotDiameter, 'shoulderPivots');
    const elbowLink = linkPlate(this.api, elbowLength, width, t, intent.pivotDiameter, 'elbowPivots');
    const wristLink = linkPlate(this.api, wristLength, width * 0.85, t, intent.pivotDiameter, 'wristPivots');
    const toolPlaceholder = this.api.union(
      this.api.box(Math.max(18, wristLength * 0.45), width * 0.7, t),
      this.api.cylinder(t, pivotRadius + intent.clearance).translate(0, (width * 0.7) / 2, 0),
    );

    this.cachedParts = [
      part('base-plate', 'servo base plate with pivot and screw pattern', basePlate),
      part('shoulder-link', 'first structural link with shoulder and elbow pivots', shoulderLink),
      part('elbow-link', 'second structural link with elbow and wrist pivots', elbowLink),
      part('wrist-link', 'short wrist link with tool pivot', wristLink),
      part('tool-placeholder', 'simple end-effector placeholder mount', toolPlaceholder),
    ];
    return this.cachedParts;
  }

  part(name: string): Shape {
    const part = this.parts().find(candidate => candidate.name === name);
    if (!part) {
      throw new KernelError(
        'feature.invalid-args',
        `robotArmKit part '${name}' does not exist.`,
        undefined,
        `Use one of: ${this.parts().map(candidate => candidate.name).join(', ')}.`,
      );
    }
    return part.shape;
  }

  manifest(): RobotArmKitManifest {
    const parts = this.parts().map(({ name, role, quantity, exportFile }) => ({
      name,
      role,
      quantity,
      exportFile,
    }));
    const joints = this.joints();
    return {
      kind: 'robot-arm-kit',
      name: this.normalizedIntent.name,
      generatedSource: 'robotArmKit(intent).model()',
      intent: this.normalizedIntent,
      parts,
      joints,
      hardware: {
        pivotDiameter: this.normalizedIntent.pivotDiameter,
        clearance: this.normalizedIntent.clearance,
        screwPattern: this.normalizedIntent.screwPattern,
      },
      validations: this.validations(),
    };
  }

  exportPackage(): RobotArmKitExportPackage {
    const manifest = this.packageManifest();
    return {
      manifestFile: 'manifest.json',
      files: [
        {
          path: 'manifest.json',
          contents: `${JSON.stringify(manifest, null, 2)}\n`,
          mediaType: 'application/json',
        },
        ...this.parts().map(part => ({
          path: `parts/${part.name}.kcad.ts`,
          contents: this.partSource(part.name),
          mediaType: 'text/x.kernelcad-typescript' as const,
        })),
      ],
    };
  }

  model(): Shape {
    if (this.cachedModel) return this.cachedModel;

    const intent = this.normalizedIntent;
    const [baseX, baseY] = intent.basePlate;
    const [shoulderLength, elbowLength, wristLength] = intent.linkLengths;
    const t = intent.plateThickness;
    const shoulderWidth = intent.linkWidth;
    const elbowWidth = intent.linkWidth;
    const wristWidth = intent.linkWidth * 0.85;
    const toolWidth = intent.linkWidth * 0.7;
    const arm = this.api.assembly(intent.name);
    const parts = this.parts();

    const basePivot: Vec3 = [baseX / 2, baseY / 2, t];
    const base = arm.part('base-plate', parts[0].shape, {
      at: [0, 0, 0],
      connectors: {
        pivot: { origin: basePivot, axis: [0, 0, 1] },
      },
    });
    const shoulder = arm.part('shoulder-link', parts[1].shape, {
      connectors: linkConnectors(shoulderLength, shoulderWidth, t),
      connect: { connector: 'root', to: base.connector('pivot'), name: 'base-to-shoulder' },
    });
    const elbow = arm.part('elbow-link', parts[2].shape, {
      connectors: linkConnectors(elbowLength, elbowWidth, t),
      connect: { connector: 'root', to: shoulder.connector('tip'), name: 'shoulder-to-elbow' },
    });
    const wrist = arm.part('wrist-link', parts[3].shape, {
      connectors: linkConnectors(wristLength, wristWidth, t),
      connect: { connector: 'root', to: elbow.connector('tip'), name: 'elbow-to-wrist' },
    });
    const tool = arm.part('tool-placeholder', parts[4].shape, {
      connectors: {
        mount: { origin: [0, toolWidth / 2, t / 2], axis: [0, 1, 0] },
      },
      connect: { connector: 'mount', to: wrist.connector('tip'), name: 'wrist-to-tool' },
    });

    const joints = this.joints();
    arm.revolute(joints[0].name, base, shoulder, {
      axis: joints[0].axis,
      origin: joints[0].origin,
      limitsDeg: joints[0].limitsDeg,
    });
    arm.revolute(joints[1].name, base, shoulder, {
      axis: joints[1].axis,
      origin: joints[1].origin,
      limitsDeg: joints[1].limitsDeg,
    });
    arm.revolute(joints[2].name, shoulder, elbow, {
      axis: joints[2].axis,
      origin: shoulder.connector('tip').worldOrigin,
      limitsDeg: joints[2].limitsDeg,
    });
    arm.revolute(joints[3].name, elbow, wrist, {
      axis: joints[3].axis,
      origin: elbow.connector('tip').worldOrigin,
      limitsDeg: joints[3].limitsDeg,
    });

    void tool;
    this.cachedModel = arm.model();
    return this.cachedModel;
  }

  private joints(): RobotArmKitManifestJoint[] {
    const intent = this.normalizedIntent;
    const [baseX, baseY] = intent.basePlate;
    const t = intent.plateThickness;
    const basePivot: Vec3 = [baseX / 2, baseY / 2, t];
    return [
      {
        name: 'base-yaw',
        type: 'revolute',
        connects: ['base-plate', 'shoulder-link'],
        axis: [0, 0, 1],
        origin: basePivot,
        limitsDeg: intent.jointLimitsDeg.base,
      },
      {
        name: 'shoulder-pitch',
        type: 'revolute',
        connects: ['base-plate', 'shoulder-link'],
        axis: [0, 1, 0],
        origin: basePivot,
        limitsDeg: intent.jointLimitsDeg.shoulder,
      },
      {
        name: 'elbow-pitch',
        type: 'revolute',
        connects: ['shoulder-link', 'elbow-link'],
        axis: [0, 1, 0],
        origin: [basePivot[0] + intent.linkLengths[0], basePivot[1], basePivot[2]],
        limitsDeg: intent.jointLimitsDeg.elbow,
      },
      {
        name: 'wrist-pitch',
        type: 'revolute',
        connects: ['elbow-link', 'wrist-link'],
        axis: [0, 1, 0],
        origin: [basePivot[0] + intent.linkLengths[0] + intent.linkLengths[1], basePivot[1], basePivot[2]],
        limitsDeg: intent.jointLimitsDeg.wrist,
      },
    ];
  }

  private packageManifest(): RobotArmKitManifest {
    const manifest = this.manifest();
    return {
      ...manifest,
      parts: manifest.parts.map(part => ({
        ...part,
        sourceFile: `parts/${part.name}.kcad.ts`,
        exportFile: `parts/${part.name}.stl`,
      })),
    };
  }

  private partSource(partName: string): string {
    const intentJson = JSON.stringify(this.normalizedIntent, null, 2);
    return [
      '// Generated by robotArmKit(intent).exportPackage().',
      '// Export this file with: kernelcad export stl <file> -o <part>.stl',
      '',
      `const intent = ${intentJson};`,
      'const kit = robotArmKit(intent);',
      `return kit.part('${partName}');`,
      '',
    ].join('\n');
  }
}

export function makeRobotArmKit(api: RobotArmKitApi, intent: RobotArmKitIntent = {}): RobotArmKitDesign {
  const normalized = normalizeIntent(intent);
  const validations = validateIntent(normalized);
  const errors = validations.filter(validation => validation.severity === 'error');
  if (errors.length > 0) {
    throw new KernelError(
      'feature.invalid-args',
      `robotArmKit intent is not mechanically valid: ${errors.map(error => error.message).join(' ')}`,
      undefined,
      errors.map(error => error.hint).filter(Boolean).join(' '),
    );
  }
  return new RobotArmKitDesign(api, normalized, validations.length > 0
    ? validations
    : [{
      severity: 'info',
      code: 'robot-arm.ok',
      message: 'Robot arm intent is mechanically valid for the static kit generator.',
    }]);
}

function normalizeIntent(intent: RobotArmKitIntent): RequiredRobotArmKitIntent {
  return {
    name: intent.name?.trim() || 'desktop robot arm kit',
    linkLengths: intent.linkLengths ?? [72, 58, 34],
    plateThickness: intent.plateThickness ?? 4,
    linkWidth: intent.linkWidth ?? 18,
    pivotDiameter: intent.pivotDiameter ?? 5,
    clearance: intent.clearance ?? 1,
    basePlate: intent.basePlate ?? [70, 46],
    screwPattern: intent.screwPattern ?? { x: 24, y: 12, diameter: 3 },
    jointLimitsDeg: {
      base: intent.jointLimitsDeg?.base ?? [-120, 120],
      shoulder: intent.jointLimitsDeg?.shoulder ?? [-45, 135],
      elbow: intent.jointLimitsDeg?.elbow ?? [-120, 120],
      wrist: intent.jointLimitsDeg?.wrist ?? [-90, 90],
    },
  };
}

function validateIntent(intent: RequiredRobotArmKitIntent): RobotArmValidation[] {
  const validations: RobotArmValidation[] = [];
  const positiveFields: Array<[string, number]> = [
    ['plateThickness', intent.plateThickness],
    ['linkWidth', intent.linkWidth],
    ['pivotDiameter', intent.pivotDiameter],
    ['clearance', intent.clearance],
    ['basePlate.x', intent.basePlate[0]],
    ['basePlate.y', intent.basePlate[1]],
    ['screwPattern.x', intent.screwPattern.x],
    ['screwPattern.y', intent.screwPattern.y],
    ['screwPattern.diameter', intent.screwPattern.diameter],
  ];
  intent.linkLengths.forEach((length, index) => positiveFields.push([`linkLengths[${index}]`, length]));

  for (const [name, value] of positiveFields) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      validations.push({
        severity: 'error',
        code: 'robot-arm.invalid-dimension',
        message: `${name} must be a positive finite number.`,
        hint: 'Use millimeter dimensions greater than zero.',
      });
    }
  }

  const requiredLinkLength = intent.pivotDiameter * 2 + intent.clearance * 4;
  for (const [index, length] of intent.linkLengths.entries()) {
    if (length < requiredLinkLength) {
      validations.push({
        severity: 'error',
        code: 'robot-arm.link-too-short',
        message: `linkLengths[${index}] must be at least ${requiredLinkLength} mm for two pivots plus clearance.`,
        hint: 'Increase the link length or reduce pivotDiameter/clearance.',
      });
    }
  }

  if (intent.pivotDiameter + intent.clearance * 2 > intent.linkWidth) {
    validations.push({
      severity: 'error',
      code: 'robot-arm.pivot-too-wide',
      message: 'pivotDiameter plus clearance must fit within linkWidth.',
      hint: 'Increase linkWidth or reduce pivotDiameter/clearance.',
    });
  }

  const screwMargin = Math.max(6, intent.screwPattern.diameter * 2);
  if (intent.screwPattern.x > intent.basePlate[0] - screwMargin * 2) {
    validations.push({
      severity: 'error',
      code: 'robot-arm.screw-pattern-too-wide',
      message: 'screwPattern.x does not fit on the basePlate with edge margin.',
      hint: 'Increase basePlate[0] or reduce screwPattern.x.',
    });
  }
  if (intent.screwPattern.y > intent.basePlate[1] - screwMargin * 2) {
    validations.push({
      severity: 'error',
      code: 'robot-arm.screw-pattern-too-tall',
      message: 'screwPattern.y does not fit on the basePlate with edge margin.',
      hint: 'Increase basePlate[1] or reduce screwPattern.y.',
    });
  }

  for (const [name, limits] of Object.entries(intent.jointLimitsDeg)) {
    if (
      !Array.isArray(limits) ||
      limits.length !== 2 ||
      !limits.every(value => typeof value === 'number' && Number.isFinite(value)) ||
      limits[0] >= limits[1]
    ) {
      validations.push({
        severity: 'error',
        code: 'robot-arm.invalid-joint-limits',
        message: `${name} joint limits must be [minDeg, maxDeg] with minDeg < maxDeg.`,
        hint: 'Pass finite joint limits in degrees.',
      });
    }
  }

  return validations;
}

function part(name: string, role: string, shape: Shape): RobotArmKitPart {
  return {
    name,
    role,
    quantity: 1,
    exportFile: `${name}.stl`,
    shape,
  };
}

function linkPlate(
  api: RobotArmKitApi,
  length: number,
  width: number,
  thickness: number,
  pivotDiameter: number,
  holeName: string,
): Shape {
  const pad = Math.max(width / 2, pivotDiameter);
  return api.box(length, width, thickness)
    .holes('top', {
      positions: [
        { u: -length / 2 + pad, v: 0 },
        { u: length / 2 - pad, v: 0 },
      ],
      diameter: pivotDiameter,
      depth: 'through',
      name: holeName,
    });
}

function linkConnectors(length: number, width: number, thickness: number): Record<string, { origin: Vec3; axis: Vec3 }> {
  return {
    root: { origin: [0, width / 2, thickness / 2], axis: [0, 1, 0] },
    tip: { origin: [length, width / 2, thickness / 2], axis: [0, 1, 0] },
  };
}
