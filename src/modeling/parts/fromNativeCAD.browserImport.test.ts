// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it, vi } from 'vitest';
import { __setHostFsForTest } from '../../shared/runtime/hostFs';
import { CaptureSession } from '../capture/captureSession';
import { fromNativeCADViaHost } from './hostParts';

const unavailablePromisify = vi.hoisted(() => vi.fn(() => {
  throw new Error('node:util.promisify is not available in the browser');
}));
vi.mock('node:util', () => ({ promisify: unavailablePromisify }));

describe('native CAD module in a browser bundle', () => {
  it('can initialize an inlined module without invoking a host-only capability', async () => {
    // A single-file worker inlines dynamic imports before any feature is called.
    // Node exports still throw on use, as they do in the production worker.
    const module = await import('./fromNativeCAD');
    expect(typeof module.fromNativeCAD).toBe('function');
    expect(unavailablePromisify).not.toHaveBeenCalled();
  });

  it('refuses a native file request through the filesystem capability guard', async () => {
    const previous = __setHostFsForTest(null);
    try {
      await expect(fromNativeCADViaHost({ session: new CaptureSession() }, 'part.sldprt'))
        .rejects.toMatchObject({
          code: 'cli.host-fs-unavailable',
          message: expect.stringContaining('lib.fromNativeCAD() needs filesystem access'),
        });
    } finally {
      __setHostFsForTest(previous);
    }
  });
});
