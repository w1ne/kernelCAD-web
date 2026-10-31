// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from 'three';

/**
 * Studio / share / embed viewer lighting.
 *
 * The scene is Z-up: the ground grid lies in XY. A key parked at [10, 20, 10]
 * is a side light (its largest component is +Y), so extrusion tops and the
 * shadow side of a dark housing fall out while the lit vertical face burns.
 * Every directional here is overhead — +Z is larger than X or Y — and the
 * fill is close to the key so the unlit side stays a shade, not a hole.
 *
 * HemisphereLight is divided by π in the three.js BRDF, unlike a directional,
 * which is why its intensity sits above 1. It is the open shade. The two
 * directionals only model the form.
 *
 * AgX rolls highlights off. Neutral at exposure 1 with a hotter key clipped
 * light plastic (display luma > 245) and, with no environment, left metalness
 * 1 faces black except for a specular spike. RoomEnvironment is what a metal
 * actually reflects; it is built Y-up, so it is rotated 90° about X to put
 * the room's ceiling on +Z.
 */
export const VIEWER_TONE_MAPPING = THREE.AgXToneMapping;

/** Display exposure. AgX at 1 keeps light nylon/delrin under the white clip. */
export const VIEWER_TONE_MAPPING_EXPOSURE = 1;

/** IBL strength on the scene and on pinned materials. 1.0 clips light metal. */
export const ROOM_ENVIRONMENT_INTENSITY = 0.62;

/** Euler X that maps the Y-up room onto this Z-up scene. */
export const ROOM_ENVIRONMENT_ROTATION_X = Math.PI / 2;

export const VIEWER_HEMISPHERE = {
    sky: 0xf7f8fa,
    ground: 0xd2d6db,
    intensity: 1.45,
    position: [0, 0, 1] as const,
};

export const VIEWER_KEY_LIGHT = {
    position: [10, -8, 22] as const,
    intensity: 0.34,
};

export const VIEWER_FILL_LIGHT = {
    position: [-12, 10, 16] as const,
    intensity: 0.26,
};
