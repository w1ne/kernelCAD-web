// tests/unit/mcp/captureAnimationTool.test.ts
//
// Unit tests for the `capture_animation` MCP tool — the request/response
// wrapper over the typed capture engine (src/agent/render/captureAnimation.ts).
// The engine is mocked via vi.mock so no browser / ffmpeg spins up in the unit
// process (the engine itself has its own browser-free DI tests). Coverage:
//   - happy path: snake_case envelope, collisions mapped, diagnostics passed,
//     ok:true with collisions present (collisions DON'T flip ok)
//   - failure: missing file → ok:false + clamped errorCode; engine model fault
//     → failure_kind 'model' with the engine's diagnostic code surfaced
//   - timeout race: a never-resolving engine returns a typed environment
//     failure (vi.useFakeTimers)
//   - registry: tool listed, required:['file'], dispatchable via callMcpTool
import { describe, it, expect, vi, afterEach } from 'vitest';
import type { CaptureAnimationResult } from '../../../src/agent/render/captureAnimation';

// Mock the engine module the tool imports. Each test installs the result it
// wants via vi.mocked(captureAnimation).mockResolvedValueOnce(...).
vi.mock('../../../src/agent/render/captureAnimation', () => ({
  captureAnimation: vi.fn(),
}));

import { captureAnimation } from '../../../src/agent/render/captureAnimation';
import {
  captureAnimationTool,
  CAPTURE_ANIMATION_TIMEOUT_MS,
} from '../../../src/agent/mcp/tools/captureAnimation';
import { getToolDefinition, callMcpTool, TOOLS } from '../../../src/agent/mcp/toolRegistry';

const mockedEngine = vi.mocked(captureAnimation);

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

/** A clean MP4 success result from the engine. */
function okResult(over: Partial<CaptureAnimationResult> = {}): CaptureAnimationResult {
  return {
    ok: true,
    outPath: '/tmp/anim.mp4',
    frameCount: 24,
    durationMs: 2000,
    fps: 12,
    diagnostics: [],
    verified: true,
    collisions: [],
    ...over,
  };
}

describe('capture_animation MCP tool — happy path', () => {
  it('maps the engine result into the snake_case envelope', async () => {
    mockedEngine.mockResolvedValueOnce(okResult());
    const r = await captureAnimationTool({ file: 'x.kcad.ts', output_path: '/tmp/anim.mp4' });
    expect(r.ok).toBe(true);
    expect(r.output_path).toBe('/tmp/anim.mp4');
    expect(r.frame_count).toBe(24);
    expect(r.duration_ms).toBe(2000);
    expect(r.fps).toBe(12);
    expect(r.verified).toBe(true);
    expect(r.collisions).toEqual([]);
    expect(r.diagnostics).toEqual([]);
    // Engine received scriptPath + outPath, no onProgress.
    const call = mockedEngine.mock.calls.at(-1)![0];
    expect(call.scriptPath).toBe('x.kcad.ts');
    expect(call.outPath).toBe('/tmp/anim.mp4');
    expect(call.onProgress).toBeUndefined();
  });

  it('maps collisions to snake_case rows and keeps ok:true (collisions are evidence)', async () => {
    mockedEngine.mockResolvedValueOnce(
      okResult({
        verified: false,
        collisions: [
          { tMs: 500, a: 'arm', b: 'base', volumeMm3: 12.5 },
          { tMs: 900, a: 'arm', b: 'slider', volumeMm3: 3.0 },
        ],
        diagnostics: [
          {
            target: 'export-occt',
            code: 'animation.collision',
            severity: 'error',
            message: 'collision at tMs=500',
            hint: 'adjust keyframes',
          },
        ],
      }),
    );
    const r = await captureAnimationTool({ file: 'x.kcad.ts' });
    expect(r.ok).toBe(true);
    expect(r.verified).toBe(false);
    expect(r.collisions).toEqual([
      { t_ms: 500, a: 'arm', b: 'base', volume_mm3: 12.5 },
      { t_ms: 900, a: 'arm', b: 'slider', volume_mm3: 3.0 },
    ]);
    // Diagnostics carried through verbatim.
    expect(r.diagnostics).toHaveLength(1);
    expect(r.diagnostics[0].code).toBe('animation.collision');
    // No top-level error on an ok:true result.
    expect(r.error).toBeUndefined();
    expect(r.failure_kind).toBeUndefined();
  });

  it('plumbs no_verify and verify_every into the engine, and surfaces verify_skipped', async () => {
    mockedEngine.mockResolvedValueOnce(okResult({ verified: false, verifySkipped: true }));
    const r = await captureAnimationTool({ file: 'x.kcad.ts', no_verify: true });
    expect(r.verify_skipped).toBe(true);
    const call = mockedEngine.mock.calls.at(-1)![0];
    expect(call.skipVerify).toBe(true);

    mockedEngine.mockResolvedValueOnce(okResult());
    await captureAnimationTool({ file: 'x.kcad.ts', verify_every: 3 });
    expect(mockedEngine.mock.calls.at(-1)![0].verifyEveryNthFrame).toBe(3);
  });

  it('forwards frames_dir as framesDir', async () => {
    mockedEngine.mockResolvedValueOnce(okResult({ outPath: '/tmp/frames' }));
    const r = await captureAnimationTool({ file: 'x.kcad.ts', frames_dir: '/tmp/frames' });
    expect(r.ok).toBe(true);
    expect(r.output_path).toBe('/tmp/frames');
    expect(mockedEngine.mock.calls.at(-1)![0].framesDir).toBe('/tmp/frames');
  });
});

describe('capture_animation MCP tool — failure surface', () => {
  it('refuses a missing file with ok:false + clamped cli.invalid-args (engine never called)', async () => {
    const r = await captureAnimationTool({} as Parameters<typeof captureAnimationTool>[0]);
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('cli.invalid-args');
    expect(r.error).toMatch(/file/);
    expect(r.errorHint).toBeTruthy();
    expect(r.failure_kind).toBe('environment');
    expect(mockedEngine).not.toHaveBeenCalled();
  });

  it('refuses inline { code } (file-only engine) before calling the engine', async () => {
    const r = await captureAnimationTool({ code: 'return box(1,1,1);' });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('cli.invalid-args');
    expect(r.error).toMatch(/code.*not supported|not supported/i);
    expect(mockedEngine).not.toHaveBeenCalled();
  });

  it('refuses output_path + frames_dir together (mutually exclusive)', async () => {
    const r = await captureAnimationTool({
      file: 'x.kcad.ts',
      output_path: '/tmp/a.mp4',
      frames_dir: '/tmp/frames',
    });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('cli.invalid-args');
    expect(r.error).toMatch(/mutually exclusive/);
    expect(mockedEngine).not.toHaveBeenCalled();
  });

  it('surfaces an engine model fault as failure_kind:model with the engine diagnostic code', async () => {
    mockedEngine.mockResolvedValueOnce({
      ok: false,
      frameCount: 0,
      durationMs: 0,
      fps: 0,
      failureKind: 'model',
      verified: false,
      collisions: [],
      diagnostics: [
        {
          target: 'export-occt',
          code: 'recompute.lowering.exception',
          severity: 'error',
          message: 'frame 5 failed to mesh',
          hint: 'fix the failing feature',
        },
      ],
    });
    const r = await captureAnimationTool({ file: 'x.kcad.ts' });
    expect(r.ok).toBe(false);
    expect(r.failure_kind).toBe('model');
    expect(r.errorCode).toBe('recompute.lowering.exception');
    expect(r.error).toBe('frame 5 failed to mesh');
    expect(r.errorHint).toBe('fix the failing feature');
  });
});

describe('capture_animation MCP tool — timeout race', () => {
  it('returns a typed environment failure when the engine never resolves', async () => {
    vi.useFakeTimers();
    // Engine hangs forever.
    mockedEngine.mockImplementationOnce(() => new Promise<CaptureAnimationResult>(() => undefined));
    const pending = captureAnimationTool({ file: 'x.kcad.ts' });
    // Trip the deadline.
    await vi.advanceTimersByTimeAsync(CAPTURE_ANIMATION_TIMEOUT_MS + 1);
    const r = await pending;
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('cli.export-exception');
    expect(r.failure_kind).toBe('environment');
    expect(r.error).toMatch(/did not finish|abandoned/i);
  });
});

describe('capture_animation MCP tool — registry', () => {
  it('is listed in TOOLS with required:[file] and a frames_dir/no_verify schema', () => {
    const def = getToolDefinition('capture_animation');
    expect(def).toBeDefined();
    expect(def!.inputSchema.required).toEqual(['file']);
    expect(def!.inputSchema.properties.frames_dir).toBeDefined();
    expect(def!.inputSchema.properties.no_verify).toBeDefined();
    expect(def!.inputSchema.properties.verify_every).toMatchObject({ type: 'integer', minimum: 1 });
    // Present in the flat TOOLS export the MCP server lists.
    expect(TOOLS.some((t) => t.name === 'capture_animation')).toBe(true);
  });

  it('is dispatchable via callMcpTool', async () => {
    mockedEngine.mockResolvedValueOnce(okResult());
    const r = (await callMcpTool('capture_animation', { file: 'x.kcad.ts' })) as {
      ok: boolean;
      frame_count: number;
    };
    expect(r.ok).toBe(true);
    expect(r.frame_count).toBe(24);
  });
});
