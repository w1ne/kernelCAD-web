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

  it('does not clear an environment the renderer cannot replace', () => {
    const scene = new THREE.Scene();
    const existing = new THREE.Texture();
    scene.environment = existing;
    const dispose = installRoomEnvironment({}, scene);
    dispose();
    expect(scene.environment).toBe(existing);
    existing.dispose();
  });

  it('keeps two scenes independent when neither renderer can build a map', () => {
    const first = new THREE.Scene();
    const second = new THREE.Scene();
    const texture = new THREE.Texture();
    first.environment = texture;
    installRoomEnvironment({}, second);
    expect(first.environment).toBe(texture);
    expect(second.environment).toBeNull();
    texture.dispose();
  });
});
