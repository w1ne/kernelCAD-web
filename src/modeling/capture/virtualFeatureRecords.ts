// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { extname } from '../../shared/runtime/pathUtils';
import { getHostFs } from '../../shared/runtime/hostFs';
import type { FeatureRef, PlaneSpec, Vec3 } from '../../shared/intent/types';
import { isValidPlaneSpec } from '../../shared/intent/types';
import type { ReferenceImageMetadata, ReferenceImageScale } from '../../shared/intent/referenceImageRecord';
import type {
  RenderEnvironmentMetadata,
  RenderEnvironmentSpec,
} from '../../shared/intent/renderEnvironmentRecord';
import { isHdriPresetKey } from '../../shared/intent/renderEnvironmentRecord';
import type { CameraTargetMetadata, CameraTargetSpec } from '../../shared/intent/cameraTargetRecord';
import {
  type AnimationViewMetadata,
  type AnimationViewSpec,
  type AnimationViewSweepSpec,
  type AnimationViewTracksSpec,
  ANIMATION_EASES,
  isAnimationViewTracksSpec,
  normalizeAnimationView,
} from '../../shared/intent/animationViewRecord';
import type { Param } from '../../shared/intent/types';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES } from '../../shared/diagnostics/registry';
import { KernelError } from '../../shared/intent/kernelError';
import type { ParamTable } from '../../shared/runtime/paramTable';

export interface VirtualFeatureSpec {
  kind: 'referenceImage' | 'renderEnvironment' | 'cameraTarget' | 'animationView';
  params: Record<string, Param>;
  inputs: Record<string, FeatureRef>;
  metadata?: Record<string, unknown>;
}

export interface ReferenceImageCaptureArgs {
  path: string;
  plane: PlaneSpec;
  anchor?: 'origin' | Vec3;
  scale?: ReferenceImageScale;
  opacity?: number;
  flipU?: boolean;
  flipV?: boolean;
}

export interface AnimationViewBuildContext {
  readonly paramTable: ParamTable;
  readonly shadowedIds: readonly string[];
}

export function buildReferenceImageFeatureSpec(
  args: ReferenceImageCaptureArgs,
  scriptDir: string | undefined,
): VirtualFeatureSpec {
  const diagnostics: CompilerDiagnostic[] = [];

  const ext = extname(args.path).toLowerCase();
  const validExts = new Set(['.png', '.jpg', '.jpeg', '.webp']);
  if (!validExts.has(ext)) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.reference-image.format-unsupported',
      severity: 'error',
      message: `referenceImage: unsupported file format '${ext || '(no extension)'}'. Supported: .png, .jpg, .jpeg, .webp.`,
      hint: HINT_TEMPLATES['feature.reference-image.format-unsupported'].template,
    });
  }

  // Existence + pixel-dimension probing needs a real filesystem. On node the
  // host-fs port is installed and this behaves exactly as it always has; in the
  // browser there is no filesystem, so we say so explicitly rather than
  // silently reporting "file not found" for a check that never ran.
  const hostFs = getHostFs();
  const resolvedPath = hostFs ? hostFs.resolveScriptRelative(scriptDir, args.path) : args.path;
  let fileExists = false;
  if (validExts.has(ext) && hostFs === null) {
    diagnostics.push({
      target: 'export-occt',
      code: 'cli.host-fs-unavailable',
      severity: 'error',
      message:
        `referenceImage('${args.path}'): this runtime has no filesystem, so the image cannot be read. ` +
        `referenceImage() works in the kernelCAD CLI and MCP server, not in the in-browser script engine.`,
      hint: HINT_TEMPLATES['cli.host-fs-unavailable'].template,
    });
  } else if (validExts.has(ext) && hostFs !== null) {
    fileExists = hostFs.fileExists(resolvedPath);
    if (!fileExists) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.reference-image.path-not-found',
        severity: 'error',
        message: `referenceImage: file not found at '${resolvedPath}'.`,
        hint: HINT_TEMPLATES['feature.reference-image.path-not-found'].template,
      });
    }
  }

  if (!isValidPlaneSpec(args.plane)) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.reference-image.invalid-plane',
      severity: 'error',
      message: `referenceImage: invalid plane '${JSON.stringify(args.plane)}'. Must be 'xy', 'xz', 'yz', or { plane, offset? }.`,
      hint: HINT_TEMPLATES['feature.reference-image.invalid-plane'].template,
    });
  }

  let pixelWidth = 0;
  let pixelHeight = 0;
  if (fileExists && hostFs !== null) {
    const dims = hostFs.imageDimensions(resolvedPath);
    pixelWidth = dims.width;
    pixelHeight = dims.height;
  }

  const scale: ReferenceImageScale = args.scale ?? 'fit-bbox';
  if (typeof scale === 'number') {
    if (!Number.isFinite(scale) || scale <= 0 || scale > 10000) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.reference-image.scale-out-of-range',
        severity: 'warn',
        message: `referenceImage: scale ${scale} is out of range. Must be in (0, 10000] mm.`,
        hint: HINT_TEMPLATES['feature.reference-image.scale-out-of-range'].template,
      });
    }
  }

  const opacity = Math.max(0, Math.min(1, args.opacity ?? 0.5));
  const metadata: ReferenceImageMetadata & { diagnostics?: CompilerDiagnostic[] } = {
    virtual: true,
    path: resolvedPath,
    plane: args.plane,
    anchor: args.anchor ?? 'origin',
    scale,
    opacity,
    flipU: args.flipU ?? false,
    flipV: args.flipV ?? false,
    pixelWidth,
    pixelHeight,
    ...(diagnostics.length > 0 ? { diagnostics } : {}),
  };

  return {
    kind: 'referenceImage',
    params: {},
    inputs: {},
    metadata: metadata as unknown as Record<string, unknown>,
  };
}

export function buildRenderEnvironmentFeatureSpec(args: RenderEnvironmentSpec): VirtualFeatureSpec {
  const diagnostics: CompilerDiagnostic[] = [];

  const hasPreset = args.preset !== undefined;
  const hasUrl = args.url !== undefined;
  if (hasPreset && hasUrl) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.render-environment.conflicting-spec',
      severity: 'error',
      message: 'setRenderEnvironment: pass either { preset } or { url }, not both.',
      hint: HINT_TEMPLATES['feature.render-environment.conflicting-spec'].template,
    });
  } else if (!hasPreset && !hasUrl) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.render-environment.missing-spec',
      severity: 'error',
      message: 'setRenderEnvironment: pass { preset } or { url }.',
      hint: HINT_TEMPLATES['feature.render-environment.missing-spec'].template,
    });
  } else if (hasPreset && !isHdriPresetKey(args.preset)) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.render-environment.unknown-preset',
      severity: 'error',
      message: `setRenderEnvironment: unknown preset '${String(args.preset)}'.`,
      hint: HINT_TEMPLATES['feature.render-environment.unknown-preset'].template,
    });
  }

  const rawIntensity = args.intensity ?? 1;
  const intensityValid = Number.isFinite(rawIntensity) && rawIntensity > 0 && rawIntensity <= 100;
  if (!intensityValid) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.render-environment.intensity-out-of-range',
      severity: 'warn',
      message: `setRenderEnvironment: intensity ${rawIntensity} is out of range (0, 100].`,
      hint: HINT_TEMPLATES['feature.render-environment.intensity-out-of-range'].template,
    });
  }
  const intensity = intensityValid ? rawIntensity : 1;
  const rotation = Number.isFinite(args.rotation) ? Number(args.rotation) : 0;

  const metadata: RenderEnvironmentMetadata & { diagnostics?: CompilerDiagnostic[] } = {
    virtual: true,
    ...(hasPreset && isHdriPresetKey(args.preset) ? { preset: args.preset } : {}),
    ...(hasUrl ? { url: args.url } : {}),
    intensity,
    rotation,
    ...(diagnostics.length > 0 ? { diagnostics } : {}),
  };

  return {
    kind: 'renderEnvironment',
    params: {},
    inputs: {},
    metadata: metadata as unknown as Record<string, unknown>,
  };
}

export function buildCameraTargetFeatureSpec(args: CameraTargetSpec): VirtualFeatureSpec {
  const diagnostics: CompilerDiagnostic[] = [];

  const xValid = Number.isFinite(args.x);
  const yValid = Number.isFinite(args.y);
  const zValid = Number.isFinite(args.z);
  if (!xValid || !yValid || !zValid) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.camera-target.non-finite-target',
      severity: 'error',
      message: `setCameraTarget: x, y, z must be finite numbers; got (${args.x}, ${args.y}, ${args.z}).`,
      hint: HINT_TEMPLATES['feature.camera-target.non-finite-target'].template,
    });
  }

  let distance: number | undefined;
  if (args.distance !== undefined) {
    if (!Number.isFinite(args.distance) || args.distance <= 0) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.camera-target.invalid-distance',
        severity: 'warn',
        message: `setCameraTarget: distance ${args.distance} is not a positive finite number; ignoring override.`,
        hint: HINT_TEMPLATES['feature.camera-target.invalid-distance'].template,
      });
    } else {
      distance = args.distance;
    }
  }

  const target: [number, number, number] = [
    xValid ? args.x : 0,
    yValid ? args.y : 0,
    zValid ? args.z : 0,
  ];
  const metadata: CameraTargetMetadata & { diagnostics?: CompilerDiagnostic[] } = {
    virtual: true,
    target,
    ...(distance !== undefined ? { distance } : {}),
    ...(diagnostics.length > 0 ? { diagnostics } : {}),
  };

  return {
    kind: 'cameraTarget',
    params: {},
    inputs: {},
    metadata: metadata as unknown as Record<string, unknown>,
  };
}

export function buildAnimationViewFeatureSpec(
  args: AnimationViewSpec,
  context: AnimationViewBuildContext,
): VirtualFeatureSpec {
  const diagnostics: CompilerDiagnostic[] = [];

  if (context.shadowedIds.length > 0) {
    diagnostics.push({
      target: 'export-occt',
      code: 'animation.view.shadowed',
      severity: 'warn',
      message: `animationView: this call shadows earlier animationView record(s) ${context.shadowedIds.join(', ')}; capture uses only the LAST record.`,
      hint: HINT_TEMPLATES['animation.view.shadowed'].template,
    });
  }

  const fps = resolveAnimationFps(args, diagnostics);
  let metadata: AnimationViewMetadata & { diagnostics?: CompilerDiagnostic[] };

  if (isAnimationViewTracksSpec(args)) {
    metadata = validateAnimationTracks(args, fps, context.paramTable);
  } else {
    metadata = validateAnimationSweep(args, fps, diagnostics, context.paramTable);
  }

  clampToParamRange(metadata.tracks, context.paramTable, diagnostics);
  if (diagnostics.length > 0) metadata.diagnostics = diagnostics;

  return {
    kind: 'animationView',
    params: {},
    inputs: {},
    metadata: metadata as unknown as Record<string, unknown>,
  };
}

function resolveAnimationFps(
  args: AnimationViewSpec,
  diagnostics: CompilerDiagnostic[],
): number {
  let fps = 30;
  if (args.fps !== undefined) {
    if (!Number.isFinite(args.fps) || args.fps <= 0) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.invalid-args',
        severity: 'warn',
        message: `animationView: 'fps' ${args.fps} is not a positive finite number; defaulting to 30.`,
        hint: `invalid-args.animation-view.bad-fps - pass fps > 0 or omit for the 30 default.`,
      });
    } else {
      fps = args.fps;
    }
  }
  return fps;
}

function clampToParamRange(
  tracks: AnimationViewMetadata['tracks'],
  paramTable: ParamTable,
  diagnostics: CompilerDiagnostic[],
): void {
  for (const track of tracks) {
    if (!paramTable.has(track.param)) continue;
    const meta = paramTable.get(track.param).meta;
    const min = meta?.min;
    const max = meta?.max;
    if (min === undefined && max === undefined) continue;
    for (const key of track.keys) {
      let clamped = key.value;
      if (min !== undefined && clamped < min) clamped = min;
      if (max !== undefined && clamped > max) clamped = max;
      if (clamped !== key.value) {
        diagnostics.push({
          target: 'export-occt',
          code: 'animation.value.clamped',
          severity: 'warn',
          message: `animationView: track '${track.param}' key at ${key.atMs}ms has value ${key.value} outside the param's declared range [${min ?? '-inf'}, ${max ?? '+inf'}]; stored value clamped to ${clamped}.`,
          hint: HINT_TEMPLATES['animation.value.clamped'].template,
        });
        key.value = clamped;
      }
    }
  }
}

function requireDeclaredNumericParam(paramTable: ParamTable, name: unknown, where: string): void {
  if (typeof name !== 'string' || name.length === 0 || !paramTable.has(name)) {
    throw new KernelError(
      'animation.param.unknown',
      `animationView: ${where} names param ${JSON.stringify(name)} which is not declared by a prior param() call.`,
      undefined,
      HINT_TEMPLATES['animation.param.unknown'].template,
    );
  }
  const declaredType = paramTable.get(name).type;
  if (declaredType !== 'number') {
    throw new KernelError(
      'animation.param.unknown',
      `animationView: ${where} names param '${name}' which is declared as ${declaredType}; animation tracks require numeric params.`,
      undefined,
      HINT_TEMPLATES['animation.param.unknown'].template,
    );
  }
}

function validateAnimationTracks(
  args: AnimationViewTracksSpec,
  fps: number,
  paramTable: ParamTable,
): AnimationViewMetadata {
  const badKeys = (why: string): never => {
    throw new KernelError(
      'animation.keys.invalid',
      `animationView: ${why}.`,
      undefined,
      HINT_TEMPLATES['animation.keys.invalid'].template,
    );
  };

  if (!Array.isArray(args.tracks) || args.tracks.length === 0) {
    badKeys(`'tracks' must be a non-empty array; got ${JSON.stringify(args.tracks)}`);
  }
  const seenParams = new Set<string>();
  for (let i = 0; i < args.tracks.length; i += 1) {
    const track = args.tracks[i];
    if (typeof track !== 'object' || track === null) {
      badKeys(`tracks[${i}] must be an object { param, keys }; got ${JSON.stringify(track)}`);
    }
    requireDeclaredNumericParam(paramTable, track.param, `tracks[${i}].param`);
    if (seenParams.has(track.param)) {
      throw new KernelError(
        'animation.track.duplicate-param',
        `animationView: tracks[${i}] targets param '${track.param}' which an earlier track already animates; merge the keys into one track per param.`,
        undefined,
        HINT_TEMPLATES['animation.track.duplicate-param'].template,
      );
    }
    seenParams.add(track.param);
    if (!Array.isArray(track.keys) || track.keys.length === 0) {
      badKeys(`tracks[${i}] ('${track.param}') has an empty keys array; declare at least one key`);
    }
    const seenAtMs = new Set<number>();
    for (let j = 0; j < track.keys.length; j += 1) {
      const key = track.keys[j];
      if (typeof key !== 'object' || key === null) {
        badKeys(`tracks[${i}].keys[${j}] must be an object { atMs, value, ease? }; got ${JSON.stringify(key)}`);
      }
      if (!Number.isFinite(key.atMs) || !Number.isFinite(key.value)) {
        badKeys(`tracks[${i}].keys[${j}] atMs and value must be finite numbers; got (atMs: ${key.atMs}, value: ${key.value})`);
      }
      if (key.atMs < 0) {
        badKeys(`tracks[${i}].keys[${j}] atMs must be >= 0; got ${key.atMs}`);
      }
      if (seenAtMs.has(key.atMs)) {
        badKeys(`tracks[${i}] ('${track.param}') has duplicate atMs ${key.atMs}; key timestamps must be unique within a track`);
      }
      seenAtMs.add(key.atMs);
      if (key.ease !== undefined && !(ANIMATION_EASES as readonly string[]).includes(key.ease as string)) {
        badKeys(`tracks[${i}].keys[${j}] has unknown ease ${JSON.stringify(key.ease)}; expected one of ${ANIMATION_EASES.join(' | ')}`);
      }
    }
  }
  return normalizeAnimationView(args, fps);
}

function validateAnimationSweep(
  args: AnimationViewSweepSpec,
  fps: number,
  diagnostics: CompilerDiagnostic[],
  paramTable: ParamTable,
): AnimationViewMetadata {
  const paramOk = typeof args.param === 'string' && args.param.length > 0;
  if (!paramOk) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      severity: 'error',
      message: `animationView: 'param' must be a non-empty string; got ${JSON.stringify(args.param)}.`,
      hint: `invalid-args.animation-view.param-empty - name a param('...') declared earlier in the script.`,
    });
  } else {
    requireDeclaredNumericParam(paramTable, args.param, `'param'`);
  }

  const fromOk = Number.isFinite(args.from);
  const toOk = Number.isFinite(args.to);
  if (!fromOk || !toOk) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      severity: 'error',
      message: `animationView: 'from' and 'to' must be finite numbers; got (${args.from}, ${args.to}).`,
      hint: `invalid-args.animation-view.non-finite-range - pass finite numeric bounds for the sweep.`,
    });
  }

  const durOk = Number.isFinite(args.durationMs) && args.durationMs > 0;
  if (!durOk) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      severity: 'error',
      message: `animationView: 'durationMs' must be a positive finite number; got ${args.durationMs}.`,
      hint: `invalid-args.animation-view.bad-duration - pass durationMs > 0 (e.g. 4000 for a 4-second sweep).`,
    });
  }

  return normalizeAnimationView(
    {
      param: paramOk ? args.param : '',
      from: fromOk ? args.from : 0,
      to: toOk ? args.to : 0,
      durationMs: durOk ? args.durationMs : 1000,
    },
    fps,
  );
}
