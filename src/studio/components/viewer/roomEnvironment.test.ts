// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { installRoomEnvironment } from './roomEnvironment';

describe('installRoomEnvironment', () => {
  it('does nothing when the renderer cannot build a PMREM map', () => {
    const scene = new THREE.Scene();
    installRoomEnvironment({}, scene);
    expect(scene.environment).toBeNull();
  });
});
