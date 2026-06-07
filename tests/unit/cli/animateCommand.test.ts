// tests/unit/cli/animateCommand.test.ts
//
// `kernelcad animate` CLI surface: arg parsing, the failureKind → exit-code
// mapping, the --json envelope (engine result as-is), --quiet, and deps
// threading into the capture engine — with the engine layer mocked (no real
// browser, no real ffmpeg), mirroring renderCommand.test.ts's approach of
// stubbing the engine module.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CompilerDiagnostic } from '../../../src/shared/diagnostics/diagnostic';
import type { CaptureAnimationResult } from '../../../src/agent/render/captureAnimation';

// Mock the capture engine before importing the command so the module under
// test picks up the stub.
vi.mock('../../../src/agent/render/captureAnimation', () => ({
  captureAnimation: vi.fn(),
}));

// Import after mock registration.
import {
  animateCommand,
  formatAnimateSummary,
  runAnimate,
} from '../../../src/agent/cli/commands/animate';
import { captureAnimation } from '../../../src/agent/render/captureAnimation';

const mockCapture = captureAnimation as ReturnType<typeof vi.fn>;

function okResult(overrides: Partial<CaptureAnimationResult> = {}): CaptureAnimationResult {
  return {
    ok: true,
    outPath: '/tmp/out.mp4',
    frameCount: 24,
    durationMs: 2000,
    fps: 12,
    diagnostics: [],
    ...overrides,
  };
}

function errorDiag(code: CompilerDiagnostic['code'], message: string): CompilerDiagnostic {
  return { target: 'export-occt', code, severity: 'error', message, hint: 'fix it' };
}

function failResult(
  failureKind: CaptureAnimationResult['failureKind'],
  diagnostics: CompilerDiagnostic[],
  overrides: Partial<CaptureAnimationResult> = {},
): CaptureAnimationResult {
  return {
    ok: false,
    frameCount: 0,
    durationMs: 0,
    fps: 0,
    diagnostics,
    failureKind,
    ...overrides,
  };
}

beforeEach(() => {
  mockCapture.mockReset();
  mockCapture.mockResolvedValue(okResult());
});

afterEach(() => {
  process.exitCode = 0;
});

describe('runAnimate', () => {
  it('success → exit 0, engine result passed through, summary names path/frames/duration/fps', async () => {
    const r = await runAnimate({ file: 'demo.kcad.ts', out: '/tmp/out.mp4' });
    expect(r.exitCode).toBe(0);
    expect(r.result).toEqual(okResult());
    expect(r.summary).toBe('Wrote /tmp/out.mp4 — 24 frames, 2000 ms @ 12 fps');
  });

  it('threads file/out/fps/onProgress into the engine opts', async () => {
    const onProgress = vi.fn();
    await runAnimate({ file: 'demo.kcad.ts', out: '/tmp/out.mp4', fps: 6, onProgress });
    expect(mockCapture).toHaveBeenCalledOnce();
    expect(mockCapture.mock.calls[0][0]).toEqual({
      scriptPath: 'demo.kcad.ts',
      outPath: '/tmp/out.mp4',
      fps: 6,
      onProgress,
    });
  });

  it('frames mode threads framesDir and no outPath', async () => {
    mockCapture.mockResolvedValue(okResult({ outPath: '/tmp/frames' }));
    const r = await runAnimate({ file: 'demo.kcad.ts', frames: '/tmp/frames' });
    expect(r.exitCode).toBe(0);
    expect(r.result.outPath).toBe('/tmp/frames');
    expect(mockCapture.mock.calls[0][0]).toEqual({
      scriptPath: 'demo.kcad.ts',
      framesDir: '/tmp/frames',
    });
  });

  it('omits unset optional opts entirely (no undefined-valued keys)', async () => {
    await runAnimate({ file: 'demo.kcad.ts' });
    expect(mockCapture.mock.calls[0][0]).toEqual({ scriptPath: 'demo.kcad.ts' });
  });

  it('out positional + --frames → exit 2 (usage) with cli.invalid-args; engine never called', async () => {
    const r = await runAnimate({
      file: 'demo.kcad.ts',
      out: '/tmp/out.mp4',
      frames: '/tmp/frames',
    });
    expect(r.exitCode).toBe(2);
    expect(r.result.ok).toBe(false);
    expect(r.result.failureKind).toBe('environment');
    expect(r.result.diagnostics).toHaveLength(1);
    expect(r.result.diagnostics[0].code).toBe('cli.invalid-args');
    expect(r.result.diagnostics[0].message).toMatch(/mutually exclusive/);
    expect(r.summary).toBeUndefined();
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it.each([NaN, 0, -5, Infinity])('bad --fps (%s) → exit 2 (usage); engine never called', async (fps) => {
    const r = await runAnimate({ file: 'demo.kcad.ts', fps });
    expect(r.exitCode).toBe(2);
    expect(r.result.failureKind).toBe('environment');
    expect(r.result.diagnostics[0].code).toBe('cli.invalid-args');
    expect(r.result.diagnostics[0].message).toMatch(/--fps/);
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it("failureKind 'model' (no animationView record) → exit 1 with the engine diagnostics", async () => {
    mockCapture.mockResolvedValue(failResult('model', [
      errorDiag('cli.invalid-args', 'The script has no animationView({...}) record; nothing to capture: demo.kcad.ts'),
    ]));
    const r = await runAnimate({ file: 'demo.kcad.ts' });
    expect(r.exitCode).toBe(1);
    expect(r.summary).toBeUndefined();
    expect(r.result.diagnostics[0].message).toMatch(/no animationView/);
  });

  it("failureKind 'model' (build-error diagnostics) → exit 1", async () => {
    mockCapture.mockResolvedValue(failResult('model', [
      errorDiag('recompute.lowering.exception', 'fillet radius too large'),
    ]));
    const r = await runAnimate({ file: 'demo.kcad.ts' });
    expect(r.exitCode).toBe(1);
    expect(r.result.diagnostics.some((d) => d.severity === 'error')).toBe(true);
  });

  it("failureKind 'environment' (ffmpeg missing) → exit 2 with cli.export-exception", async () => {
    mockCapture.mockResolvedValue(failResult('environment', [
      errorDiag('cli.export-exception', 'ffmpeg was not found on PATH; MP4 capture requires it.'),
    ], { durationMs: 2000, fps: 12 }));
    const r = await runAnimate({ file: 'demo.kcad.ts' });
    expect(r.exitCode).toBe(2);
    expect(r.result.diagnostics[0].code).toBe('cli.export-exception');
  });

  it("failureKind 'environment' (page bootstrap failure) → exit 2", async () => {
    mockCapture.mockResolvedValue(failResult('environment', [
      errorDiag('cli.export-exception', 'captureAnimation: page.goto: net::ERR_CONNECTION_REFUSED'),
    ]));
    const r = await runAnimate({ file: 'demo.kcad.ts' });
    expect(r.exitCode).toBe(2);
  });

  it('failure with failureKind absent maps to exit 2 (defensive default, never 0)', async () => {
    mockCapture.mockResolvedValue(failResult(undefined, [
      errorDiag('cli.export-exception', 'unknown failure'),
    ]));
    const r = await runAnimate({ file: 'demo.kcad.ts' });
    expect(r.exitCode).toBe(2);
  });

  it('failure produces no summary even when the engine echoed a frameCount', async () => {
    mockCapture.mockResolvedValue(failResult('model', [
      errorDiag('recompute.lowering.exception', 'frame 3 failed'),
    ], { frameCount: 3, durationMs: 2000, fps: 12 }));
    const r = await runAnimate({ file: 'demo.kcad.ts' });
    expect(r.exitCode).toBe(1);
    expect(r.summary).toBeUndefined();
    expect(r.result.frameCount).toBe(3);
  });
});

describe('formatAnimateSummary', () => {
  it('is one concise line with path, frames, duration, fps', () => {
    const s = formatAnimateSummary({
      outPath: '/tmp/a.mp4', frameCount: 24, durationMs: 2000, fps: 12,
    });
    expect(s).toBe('Wrote /tmp/a.mp4 — 24 frames, 2000 ms @ 12 fps');
    expect(s).not.toContain('\n');
  });
});

describe('animateCommand wiring', () => {
  it('declares the positionals and the --frames/--fps/--json/--quiet options', () => {
    const cmd = animateCommand();
    expect(cmd.name()).toBe('animate');
    const args = cmd.registeredArguments.map((a) => ({ name: a.name(), required: a.required }));
    expect(args).toEqual([
      { name: 'file', required: true },
      { name: 'out', required: false },
    ]);
    expect(cmd.options.find((o) => o.long === '--frames')).toBeDefined();
    expect(cmd.options.find((o) => o.long === '--fps')).toBeDefined();
    expect(cmd.options.find((o) => o.long === '--json')).toBeDefined();
    expect(cmd.options.find((o) => o.long === '--quiet')).toBeDefined();
  });

  it('documents the exit codes (0 captured / 1 model at fault / 2 environment-or-usage) in help', () => {
    // helpInformation() omits addHelpText blocks; render full help through
    // commander's configured output instead.
    let help = '';
    const cmd = animateCommand();
    cmd.configureOutput({ writeOut: (s: string) => { help += s; } });
    cmd.outputHelp();
    expect(help).toContain('Exit codes:');
    expect(help).toContain('0  animation captured');
    expect(help).toContain('1  the model is at fault');
    expect(help).toContain('2  environmental/usage failure');
  });

  it('--fps parses to a number before reaching the engine', async () => {
    const errSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      await animateCommand().parseAsync(['demo.kcad.ts', '--fps', '6'], { from: 'user' });
    } finally {
      errSpy.mockRestore();
    }
    expect(mockCapture).toHaveBeenCalledOnce();
    expect(mockCapture.mock.calls[0][0]).toMatchObject({ scriptPath: 'demo.kcad.ts', fps: 6 });
    expect(process.exitCode).toBe(0);
  });

  it('--json success: stdout is exactly the engine result; progress STILL wired to stderr', async () => {
    const logs: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((s: string) => { logs.push(s); });
    const errSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      await animateCommand().parseAsync(['demo.kcad.ts', '/tmp/out.mp4', '--json'], { from: 'user' });
      // Even under --json the engine gets a progress sink — it writes to
      // stderr, never stdout.
      const opts = mockCapture.mock.calls[0][0] as { onProgress?: (m: string) => void };
      expect(typeof opts.onProgress).toBe('function');
      opts.onProgress!('frame 10/24');
      expect(errSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T[\d:.]+Z\] frame 10\/24\n$/),
      );
    } finally {
      logSpy.mockRestore();
      errSpy.mockRestore();
    }
    expect(logs).toHaveLength(1);
    const env = JSON.parse(logs[0]);
    expect(env).toEqual({
      ok: true,
      outPath: '/tmp/out.mp4',
      frameCount: 24,
      durationMs: 2000,
      fps: 12,
      diagnostics: [],
    });
    expect(process.exitCode).toBe(0);
  });

  it('--json failure: ok:false envelope with failureKind and diagnostics; exit code 1 for model fault', async () => {
    mockCapture.mockResolvedValue(failResult('model', [
      errorDiag('cli.invalid-args', 'no animationView'),
    ]));
    const logs: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((s: string) => { logs.push(s); });
    const errSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      await animateCommand().parseAsync(['demo.kcad.ts', '--json'], { from: 'user' });
    } finally {
      logSpy.mockRestore();
      errSpy.mockRestore();
    }
    expect(logs).toHaveLength(1);
    const env = JSON.parse(logs[0]);
    expect(env.ok).toBe(false);
    expect(env.failureKind).toBe('model');
    expect(env.outPath).toBeUndefined();
    expect(Array.isArray(env.diagnostics)).toBe(true);
    expect(env.diagnostics[0].code).toBe('cli.invalid-args');
    expect(process.exitCode).toBe(1);
  });

  it('--quiet: NO progress sink reaches the engine', async () => {
    const logs: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((s: string) => { logs.push(s); });
    try {
      await animateCommand().parseAsync(['demo.kcad.ts', '/tmp/out.mp4', '--quiet'], { from: 'user' });
    } finally {
      logSpy.mockRestore();
    }
    expect(mockCapture.mock.calls[0][0]).not.toHaveProperty('onProgress');
    expect(process.exitCode).toBe(0);
  });

  it('human mode success prints the summary line and wires a timestamped stderr progress sink', async () => {
    const logs: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((s: string) => { logs.push(s); });
    const errSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      await animateCommand().parseAsync(['demo.kcad.ts', '/tmp/out.mp4'], { from: 'user' });
      const opts = mockCapture.mock.calls[0][0] as { onProgress?: (m: string) => void };
      expect(typeof opts.onProgress).toBe('function');
      opts.onProgress!('frame 10/24');
      expect(errSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T[\d:.]+Z\] frame 10\/24\n$/),
      );
    } finally {
      logSpy.mockRestore();
      errSpy.mockRestore();
    }
    expect(logs).toEqual(['Wrote /tmp/out.mp4 — 24 frames, 2000 ms @ 12 fps']);
    expect(process.exitCode).toBe(0);
  });

  it('out positional + --frames via the command → exit code 2, engine never called', async () => {
    const logs: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((s: string) => { logs.push(s); });
    try {
      await animateCommand().parseAsync(
        ['demo.kcad.ts', '/tmp/out.mp4', '--frames', '/tmp/frames'],
        { from: 'user' },
      );
    } finally {
      logSpy.mockRestore();
    }
    expect(mockCapture).not.toHaveBeenCalled();
    expect(logs.join('\n')).toMatch(/mutually exclusive/);
    expect(process.exitCode).toBe(2);
  });
});
