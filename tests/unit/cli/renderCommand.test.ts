// tests/unit/cli/renderCommand.test.ts
//
// Verifies that:
//  1. `renderScript` passes `hideReferenceImages` through to `headlessRender`.
//  2. The CLI option `--hide-reference-images` is declared on `renderCommand`.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Mock headlessRender before importing the command so the module under test
// picks up the stub.
vi.mock('../../../src/agent/render/headlessRender', () => {
  const ALL_VIEWS = ['front', 'right', 'top', 'iso'] as const;
  const mockHeadlessRender = vi.fn();
  const composite2x2 = vi.fn().mockResolvedValue(Buffer.alloc(0));
  return { headlessRender: mockHeadlessRender, composite2x2, ALL_VIEWS };
});

// Import after mock registration.
import { renderScript, renderCommand } from '../../../src/agent/cli/commands/render';
import { headlessRender } from '../../../src/agent/render/headlessRender';

const mockHeadlessRender = headlessRender as ReturnType<typeof vi.fn>;

/** Minimal PerView buffer map the mock returns. */
function makeMockResult() {
  const buf = Buffer.alloc(4);
  return {
    pngsByView: { front: buf, right: buf, top: buf, iso: buf },
    bounds: { min: [0, 0, 0] as [number, number, number], max: [1, 1, 1] as [number, number, number] },
  };
}

describe('render command: --hide-reference-images flag', () => {
  let tmp: string;
  let scriptPath: string;

  beforeEach(() => {
    mockHeadlessRender.mockReset();
    mockHeadlessRender.mockResolvedValue(makeMockResult());
    tmp = mkdtempSync(join(tmpdir(), 'kcad-render-test-'));
    scriptPath = join(tmp, 'demo.kcad.ts');
    // File must exist for resolve() to work; headlessRender is mocked so content
    // doesn't matter.
    writeFileSync(scriptPath, 'return box(1,1,1);');
  });

  it('passes hideReferenceImages: true when flag is set', async () => {
    await renderScript({
      file: scriptPath,
      out: join(tmp, 'out.png'),
      separate: false,
      width: 512,
      height: 512,
      baseUrl: 'http://localhost:5173',
      hideReferenceImages: true,
    });

    expect(mockHeadlessRender).toHaveBeenCalledOnce();
    expect(mockHeadlessRender.mock.calls[0][0]).toMatchObject({
      hideReferenceImages: true,
    });
  });

  it('passes hideReferenceImages: false when flag is not set', async () => {
    await renderScript({
      file: scriptPath,
      out: join(tmp, 'out.png'),
      separate: false,
      width: 512,
      height: 512,
      baseUrl: 'http://localhost:5173',
      hideReferenceImages: false,
    });

    expect(mockHeadlessRender).toHaveBeenCalledOnce();
    expect(mockHeadlessRender.mock.calls[0][0]).toMatchObject({
      hideReferenceImages: false,
    });
  });

  it('renderCommand declares --hide-reference-images option with correct description', () => {
    const cmd = renderCommand();
    const opt = cmd.options.find((o) => o.long === '--hide-reference-images');
    expect(opt).toBeDefined();
    expect(opt?.description).toBe('hide referenceImage() overlays in rendered output (default false)');
    // Default value must be false (not undefined / not true).
    expect(opt?.defaultValue).toBe(false);
  });
});
