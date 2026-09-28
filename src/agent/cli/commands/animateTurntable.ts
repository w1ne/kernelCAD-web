// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/cli/commands/animateTurntable.ts
//
// `kernelcad animate --turntable` — the CLI face of capture_animation
// ({ turntable: true }). Flags resolve through the MCP tool's own validator
// (resolveTurntableSettings in captureTurntableInput.ts) and drive the same
// engine (captureTurntable.ts) through the same option mapping
// (turntableCaptureOpts), so the CLI and the tool cannot drift. Only the
// flag names and the refusal wording are CLI-specific here.

import type { Command } from 'commander';
import { captureTurntable } from '../../render/captureTurntable';
import type { CaptureAnimationResult } from '../../render/captureAnimation';
import type { HeadlessObjectFilter } from '../../render/headlessRender';
import {
  resolveTurntableSettings,
  turntableCaptureOpts,
  type TurntableInputFields,
  type TurntableRefusal,
} from '../../mcp/tools/captureTurntableInput';
import type { RenderPreset } from '../../../shared/render/publishPreset';

/** Turntable fields of the `animate` CLI input. */
export interface TurntableCliFields {
  /** Turntable mode (`--turntable`): 360° orbit of the static model. */
  turntable?: boolean;
  /** Turntable look (`--preset`); default 'publish'. */
  preset?: string;
  /** Turntable frame size in px (`--width` / `--height`; default 1080). */
  width?: number;
  height?: number;
  /** Turntable: one revolution in ms (`--duration-ms`; default 6000). */
  durationMs?: number;
  /** Turntable: camera elevation in degrees (`--elevation`; default 22). */
  elevation?: number;
  /** Turntable + publish: backdrop (`--background`). */
  background?: string;
  /** Turntable + publish: contact shadow (`--no-shadow` → false). */
  shadow?: boolean;
  /** Turntable: HDRI environment override (`--environment`). */
  environment?: string;
}

/** The shared fields a turntable run also reads from the animate input. */
interface TurntableRunInput extends TurntableCliFields {
  file: string;
  out?: string;
  frames?: string;
  fps?: number;
  verifyEvery?: number;
  baseUrl?: string;
  onProgress?: (msg: string) => void;
}

/** Turntable-only fields and their flag spellings. */
const TURNTABLE_ONLY_FLAGS: ReadonlyArray<readonly [keyof TurntableCliFields, string]> = [
  ['preset', '--preset'],
  ['width', '--width'],
  ['height', '--height'],
  ['durationMs', '--duration-ms'],
  ['elevation', '--elevation'],
  ['background', '--background'],
  ['shadow', '--no-shadow'],
  ['environment', '--environment'],
];

/** Drop undefined-valued keys: the engines treat a present key as set. */
function definedOnly<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/** Timeline mode: the turntable-only flags are refused, not ignored. */
export function turntableOnlyFlagsRefusal(input: TurntableCliFields): TurntableRefusal | undefined {
  const present = TURNTABLE_ONLY_FLAGS.filter(([field]) => input[field] !== undefined).map(([, flag]) => flag);
  if (present.length === 0) return undefined;
  return {
    message: `animate: ${present.join(', ')} apply only to --turntable.`,
    hint: 'Add --turntable for a 360° orbit of the model, or drop those flags to capture the animationView timeline.',
  };
}

/** The shared validator words its refusals for the MCP tool; name the CLI
 *  command and flags instead. */
function toCliWording(text: string): string {
  return text
    .replace(/^capture_animation: /, 'animate --turntable: ')
    .replace(/\bframes_dir\b/g, '--frames')
    .replace(/\bduration_ms\b/g, '--duration-ms')
    .replace(/\belevation_deg\b/g, '--elevation')
    .replace(/\bverify_every\b/g, '--verify-every');
}

/** Validate the turntable flags (MCP rules) and start the capture, or
 *  return the refusal in CLI wording. */
export function captureTurntableFromCli(
  input: TurntableRunInput,
  objectFilter: HeadlessObjectFilter | undefined,
): Promise<CaptureAnimationResult> | TurntableRefusal {
  const fields: TurntableInputFields = definedOnly({
    preset: input.preset as RenderPreset | undefined,
    width: input.width,
    height: input.height,
    duration_ms: input.durationMs,
    elevation_deg: input.elevation,
    background: input.background,
    shadow: input.shadow,
    fps: input.fps,
    output_path: input.out,
    frames_dir: input.frames,
    verify_every: input.verifyEvery,
  });
  const settings = resolveTurntableSettings(fields);
  if ('message' in settings) {
    return { message: toCliWording(settings.message), hint: toCliWording(settings.hint) };
  }
  return captureTurntable(
    turntableCaptureOpts(settings, {
      scriptPath: input.file,
      ...definedOnly({
        outPath: input.out,
        framesDir: input.frames,
        objectFilter,
        environment: input.environment,
        baseUrl: input.baseUrl,
        onProgress: input.onProgress,
      }),
    }),
  );
}

/** Declare the turntable flags on the `animate` command. */
export function configureTurntableOptions(cmd: Command): Command {
  return cmd
    .option('--turntable', 'capture a seamless 360° orbit of the (static) model instead of the animationView timeline')
    .option('--preset <name>', "--turntable only: look, 'publish' (default; studio product shot) or 'default' (engineering look)")
    .option('--width <n>', '--turntable only: frame width in px (default 1080; even for MP4)', (v) => Number(v))
    .option('--height <n>', '--turntable only: frame height in px (default 1080; even for MP4)', (v) => Number(v))
    .option('--duration-ms <ms>', '--turntable only: one revolution in ms (default 6000)', (v) => Number(v))
    .option('--elevation <deg>', '--turntable only: camera elevation above the horizon in degrees (default 22)', (v) => Number(v))
    .option(
      '--background <color>',
      "--turntable + publish only: 'white' (default), 'light', 'dark', 'black', a hex colour, or 'transparent' (needs --frames)",
    )
    .option('--no-shadow', '--turntable + publish only: drop the soft contact shadow')
    .option('--environment <preset|url|none>', '--turntable only: HDRI environment override (same values as `kernelcad render --environment`)');
}

/** Parsed commander opts → the turntable input fields. */
export function turntableCliInput(
  opts: TurntableCliFields & { shadow: boolean },
  command: Pick<Command, 'getOptionValueSource'>,
): TurntableCliFields {
  return definedOnly({
    turntable: opts.turntable === true ? true : undefined,
    preset: opts.preset,
    width: opts.width,
    height: opts.height,
    durationMs: opts.durationMs,
    elevation: opts.elevation,
    background: opts.background,
    // Only when --no-shadow was passed: commander always materializes true.
    shadow: command.getOptionValueSource('shadow') === 'cli' ? opts.shadow : undefined,
    environment: opts.environment,
  });
}
