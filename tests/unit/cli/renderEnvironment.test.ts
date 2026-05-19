// tests/unit/cli/renderEnvironment.test.ts
//
// Verifies that:
//  1. `renderScript` passes `environment` through to `headlessRender`.
//  2. The CLI option `--environment` is declared on `renderCommand`.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

vi.mock('../../../src/agent/render/headlessRender', () => {
  const ALL_VIEWS = ['front', 'right', 'top', 'iso'] as const;
  const mockHeadlessRender = vi.fn();
  const composite2x2 = vi.fn().mockResolvedValue(Buffer.alloc(0));
  return { headlessRender: mockHeadlessRender, composite2x2, ALL_VIEWS };
});

import { renderScript, renderCommand } from '../../../src/agent/cli/commands/render';
import { headlessRender } from '../../../src/agent/render/headlessRender';

const mockHeadlessRender = headlessRender as ReturnType<typeof vi.fn>;

function makeMockResult() {
  const buf = Buffer.alloc(4);
  return {
    pngsByView: { front: buf, right: buf, top: buf, iso: buf },
    pngsByPose: {},
    bounds: { min: [0, 0, 0] as [number, number, number], max: [1, 1, 1] as [number, number, number] },
  };
}

describe('render command: --environment flag', () => {
  let tmp: string;
  let scriptPath: string;

  beforeEach(() => {
    mockHeadlessRender.mockReset();
    mockHeadlessRender.mockResolvedValue(makeMockResult());
    tmp = mkdtempSync(join(tmpdir(), 'kcad-render-env-test-'));
    scriptPath = join(tmp, 'demo.kcad.ts');
    writeFileSync(scriptPath, 'return box(1,1,1);');
  });

  it('passes environment="studio" through to headlessRender', async () => {
    await renderScript({
      file: scriptPath,
      out: join(tmp, 'out.png'),
      separate: false,
      width: 512,
      height: 512,
      baseUrl: 'http://localhost:5173',
      hideReferenceImages: false,
      environment: 'studio',
    });
    expect(mockHeadlessRender).toHaveBeenCalledOnce();
    expect(mockHeadlessRender.mock.calls[0][0]).toMatchObject({ environment: 'studio' });
  });

  it('passes environment="none" through to suppress env', async () => {
    await renderScript({
      file: scriptPath,
      out: join(tmp, 'out.png'),
      separate: false,
      width: 512,
      height: 512,
      baseUrl: 'http://localhost:5173',
      hideReferenceImages: false,
      environment: 'none',
    });
    expect(mockHeadlessRender.mock.calls[0][0]).toMatchObject({ environment: 'none' });
  });

  it('omits environment when not set (default rig)', async () => {
    await renderScript({
      file: scriptPath,
      out: join(tmp, 'out.png'),
      separate: false,
      width: 512,
      height: 512,
      baseUrl: 'http://localhost:5173',
      hideReferenceImages: false,
    });
    expect(mockHeadlessRender.mock.calls[0][0].environment).toBeUndefined();
  });

  it('renderCommand declares --environment option', () => {
    const cmd = renderCommand();
    const opt = cmd.options.find((o) => o.long === '--environment');
    expect(opt).toBeDefined();
    expect(opt?.description).toMatch(/HDRI|preset|environment/i);
  });
});
