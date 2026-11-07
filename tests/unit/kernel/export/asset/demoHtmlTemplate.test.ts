// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import {
  ASSET_PACK_THREE_VERSION,
  renderAssetPackDemoHtml,
} from '../../../../../src/kernel/export/asset/demoHtmlTemplate';

describe('renderAssetPackDemoHtml', () => {
  it('loads three and its addons from one pinned import map and the packed GLB', () => {
    const html = renderAssetPackDemoHtml('mounting-plate');
    expect(html).toContain('<script type="importmap">');
    expect(html).toContain(`"three": "https://cdn.jsdelivr.net/npm/three@${ASSET_PACK_THREE_VERSION}/build/three.module.js"`);
    expect(html).toContain(`"three/addons/": "https://cdn.jsdelivr.net/npm/three@${ASSET_PACK_THREE_VERSION}/examples/jsm/"`);
    expect(html).toContain('three/addons/loaders/GLTFLoader.js');
    expect(html).toContain('three/addons/controls/OrbitControls.js');
    expect(html).toContain('preserveDrawingBuffer: true');
    expect(html).toContain('mounting-plate.glb');
    expect(html.split(ASSET_PACK_THREE_VERSION).length - 1).toBe(2);
  });
});
