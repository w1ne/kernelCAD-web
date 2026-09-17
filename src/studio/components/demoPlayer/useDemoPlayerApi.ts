// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimationEngine } from './AnimationEngine';
import { CameraController } from './CameraController';
import type { TerminalLine } from './TerminalPane';
import { parseSectionParam } from './sectionParam';
import { sectionPlaneFromState } from '../viewer/sectionPlane';
import { createDemoPlayerWindowApi, type DemoPlayerSceneContext } from './demoPlayerApiFactory';

/**
 * Owns the `window.__demoPlayer` bridge API: the scene-ready handshake, the
 * refs the headless/CLI-driven API methods read and write, and the
 * install/teardown effect. Returns the render-relevant slices of state
 * (`version`, `terminalLines`, `titleCard`) plus `elapsedMsRef` /
 * `terminalOriginRef`, which the page's JSX reads directly for the
 * terminal clock.
 */
export function useDemoPlayerApi() {
    const sceneRef = useRef<DemoPlayerSceneContext | null>(null);
    const animEngineRef = useRef<AnimationEngine | null>(null);
    const cameraCtrlRef = useRef<CameraController | null>(null);
    const elapsedMsRef = useRef(0);
    const terminalOriginRef = useRef(0);
    // Default to the package version that vite injects at build time so the
    // watermark stays in sync with shipped releases. captureDemo overrides
    // via setVersion() to the module string (e.g. "v0.6", "gallery"); the
    // kernelcad render CLI doesn't, so this default is what static renders
    // show. Previously hardcoded "v0.21", which silently went stale across
    // every minor release after v0.2.
    const [version, setVersion] = useState(
        typeof __APP_VERSION__ !== 'undefined' ? `v${__APP_VERSION__}` : 'DEV',
    );
    const [isDemoApiReady, setIsDemoApiReady] = useState(false);
    const [terminalLines, setTerminalLines] = useState<readonly TerminalLine[]>([]);
    const [titleCard, setTitleCard] = useState<{ title: string; tagline: string; durationMs: number } | null>(
        null,
    );
    // Camera-target override captured from the script's setCameraTarget()
    // call. `target` is in the SCRIPT'S world frame (before geometry
    // recentering); `centroidOffset` is the per-load shift applied to
    // geometry groups so the bbox centroid lands at world origin.
    // setRenderPose / setRenderView subtract the offset to translate the
    // target into the scene's recentered frame. `null` means no override →
    // fall back to existing bbox-centroid auto-fit. Persists across
    // setRenderPose calls within a load.
    const cameraTargetRef = useRef<{
        target: [number, number, number];
        distance?: number;
    } | null>(null);
    const centroidOffsetRef = useRef<[number, number, number]>([0, 0, 0]);

    const handleSceneReady = useCallback((ctx: DemoPlayerSceneContext) => {
        sceneRef.current = ctx;
        animEngineRef.current = new AnimationEngine(ctx.scene);
        cameraCtrlRef.current = new CameraController(ctx.camera, ctx.scene);
        // ?section=<axis>:<pos> (+ ?sectionflip=1) — headless render section
        // plane, wired from the CLI's --section flag via headlessRender. GLOBAL
        // renderer clipping is sufficient here: the demo-player scene contains
        // only the model and reference-image planes, so no per-material
        // traversal or localClippingEnabled is needed. Plane math is shared
        // with the Studio section tool (sectionPlaneFromState).
        const params = new URLSearchParams(window.location.search);
        const sectionState = parseSectionParam(params.get('section'), params.get('sectionflip'));
        if (sectionState) {
            ctx.renderer.clippingPlanes = [
                sectionPlaneFromState(sectionState.axis, sectionState.flip, sectionState.position),
            ];
        }
    }, []);

    useEffect(() => {
        if (!animEngineRef.current || !cameraCtrlRef.current) return;
        window.__demoPlayer = createDemoPlayerWindowApi({
            sceneRef,
            animEngineRef,
            cameraCtrlRef,
            elapsedMsRef,
            terminalOriginRef,
            cameraTargetRef,
            centroidOffsetRef,
            setTerminalLines: (lines) => setTerminalLines(lines),
            setTitleCard: (spec) => setTitleCard(spec),
            setVersion: (v) => setVersion(v),
        });
        let tornDown = false;
        // Deferred a microtask so this isn't a *synchronous* setState call in
        // the effect body (flagged by react-hooks/set-state-in-effect);
        // microtasks still drain before the next paint, so consumers see
        // `isDemoApiReady` flip in the same commit as before.
        void Promise.resolve().then(() => {
            if (!tornDown) setIsDemoApiReady(true);
        });
        return () => {
            tornDown = true;
            setIsDemoApiReady(false);
            delete window.__demoPlayer;
        };
    }, []);

    return {
        handleSceneReady,
        isDemoApiReady,
        version,
        terminalLines,
        titleCard,
        elapsedMsRef,
        terminalOriginRef,
    };
}
