// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { GeometryResult } from '../../../shared/worker/geometryEngine';
import type { ViewportBackground } from '../../../shared/types/viewMode';
import { buildContactShadow, type ContactShadow } from '../demoPlayer/contactShadow';
import { CAPTURE_HIDDEN_FLAG } from './captureViewerPng';
import {
    DARK_BACKDROP_SHADOW_GAIN,
    LIVE_CONTACT_SHADOW_LAYERS,
    MODEL_ROOT_FLAG,
    PUBLISH_HEMISPHERE_GROUND,
    PUBLISH_LIGHTS,
    cameraAzimuthDeg,
    type PublishLightSpec,
} from './publishLook';

const ORIGIN = new THREE.Vector3();

/** Direction (unit, Z-up) of a light at az/el in the publish convention. */
function lightDirection(azDeg: number, elDeg: number): THREE.Vector3 {
    const az = (azDeg * Math.PI) / 180;
    const el = (elDeg * Math.PI) / 180;
    return new THREE.Vector3(Math.sin(az) * Math.cos(el), -Math.cos(az) * Math.cos(el), Math.sin(el));
}

function RigLight({ spec }: { spec: PublishLightSpec }) {
    if (spec.kind === 'hemisphere') {
        return <hemisphereLight color={spec.color} groundColor={PUBLISH_HEMISPHERE_GROUND} intensity={spec.intensity} position={[0, 0, 1]} />;
    }
    // Only the direction matters: the target stays at the world origin.
    const position = lightDirection(spec.azOffsetDeg, spec.elDeg).multiplyScalar(100);
    return <directionalLight color={spec.color} intensity={spec.intensity} position={position.toArray()} />;
}

/** Key / fill / rim rig that turns with the camera azimuth, so the model is
 *  lit like the hero shot from every orbit angle. */
function CameraRig() {
    const rig = useRef<THREE.Group>(null);
    const controls = useThree((state) => state.controls) as unknown as { target?: THREE.Vector3 } | null;
    useFrame(({ camera }) => {
        if (!rig.current) return;
        const target = controls?.target ?? ORIGIN;
        rig.current.rotation.z = (cameraAzimuthDeg(camera.position, target) * Math.PI) / 180;
    });
    return (
        <group ref={rig} name="__publishLookRig">
            {PUBLISH_LIGHTS.map((spec, i) => <RigLight key={i} spec={spec} />)}
        </group>
    );
}

/** The model's drawn shape meshes: under the model root, tagged as faces. */
function modelMeshes(scene: THREE.Scene): THREE.Mesh[] {
    const out: THREE.Mesh[] = [];
    scene.traverse((obj) => {
        if (!(obj.userData as Record<string, unknown>)[MODEL_ROOT_FLAG]) return;
        obj.traverseVisible((child) => {
            if (child instanceof THREE.Mesh && child.userData.type === 'FACE') out.push(child);
        });
    });
    return out;
}

/** A playing animation replaces the geometry list every frame; the shadow
 *  is re-baked once it has been still this long, not per frame. */
const SHADOW_REBAKE_DELAY_MS = 200;

function bakeShadows(gl: THREE.WebGLRenderer, scene: THREE.Scene, gain: number): ContactShadow[] {
    scene.updateMatrixWorld(true);
    const casters = modelMeshes(scene);
    const bounds = new THREE.Box3();
    for (const mesh of casters) bounds.expandByObject(mesh);
    if (bounds.isEmpty()) return [];
    const baked: ContactShadow[] = [];
    try {
        for (const layer of LIVE_CONTACT_SHADOW_LAYERS) {
            baked.push(buildContactShadow(gl, scene, casters, bounds, { ...layer, opacity: Math.min(1, layer.opacity * gain) }));
        }
    } catch {
        // A context that cannot bake a render target shows the model without a shadow.
        for (const shadow of baked) shadow.dispose();
        return [];
    }
    return baked;
}

/** Soft contact shadow under the model, baked when the geometry changes. */
function LiveContactShadow({ geometries, background }: { geometries: GeometryResult[]; background: ViewportBackground }) {
    const gl = useThree((state) => state.gl);
    const scene = useThree((state) => state.scene);
    const invalidate = useThree((state) => state.invalidate);
    const holder = useRef<THREE.Group>(null);
    const current = useRef<ContactShadow[]>([]);
    const baked = useRef(false);
    const gain = background === 'dark' ? DARK_BACKDROP_SHADOW_GAIN : 1;

    useEffect(() => {
        const group = holder.current;
        if (!group) return undefined;
        const swap = (next: ContactShadow[]) => {
            for (const shadow of current.current) {
                group.remove(shadow.plane);
                shadow.dispose();
            }
            current.current = next;
            for (const shadow of next) group.add(shadow.plane);
            invalidate();
        };
        if (geometries.length === 0) {
            swap([]);
            return undefined;
        }
        // The first bake waits one frame (the shapes mount and take their
        // transforms); later ones wait for the geometry to settle. The old
        // shadow stays until its replacement is ready.
        let raf = 0;
        const timer = window.setTimeout(() => {
            raf = requestAnimationFrame(() => {
                baked.current = true;
                swap(bakeShadows(gl, scene, gain));
            });
        }, baked.current ? SHADOW_REBAKE_DELAY_MS : 0);
        return () => {
            window.clearTimeout(timer);
            cancelAnimationFrame(raf);
        };
    }, [gl, scene, invalidate, geometries, gain]);

    useEffect(() => () => {
        for (const shadow of current.current) shadow.dispose();
        current.current = [];
    }, []);

    // Hidden in render-to-image capture like the grid: the PNG frames the model.
    return <group ref={holder} name="__publishLookShadow" userData={{ [CAPTURE_HIDDEN_FLAG]: true }} />;
}

/**
 * The publish look's stage inside the Canvas: the camera-relative light rig
 * and the contact shadow. The room IBL stays from the viewer
 * (RoomEnvironmentRig); tone mapping is set on the Canvas (Viewer).
 */
export function PublishStage({ geometries, background }: { geometries: GeometryResult[]; background: ViewportBackground }) {
    return (
        <>
            <CameraRig />
            <LiveContactShadow geometries={geometries} background={background} />
        </>
    );
}
