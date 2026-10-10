// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useEffect, useRef } from "react";
import { HoverManager, type HoverResult } from "../../../features-ui/interaction/HoverManager";
import { SnapManager, type SnapResult } from "../../../features-ui/interaction/SnapManager";
import { filterClippedIntersections } from "../clipFilter";

interface InteractionHandlerProps {
    setHovered: (h: HoverResult | null) => void;
    setSnap: (s: SnapResult | null) => void;
    /** Pre-select only while a mouse is over the canvas. The pointer starts
     *  at the canvas centre and a touch leaves it where the finger lifted, so
     *  without this a viewer that is only being looked at (the embed) shows
     *  a hover highlight nobody asked for. */
    mouseHoverOnly?: boolean;
}

/** Whether a mouse is over `el` right now (touch and pen never hover). */
function useMouseOver(el: HTMLElement, enabled: boolean) {
    const over = useRef(false);
    useEffect(() => {
        if (!enabled) return undefined;
        const update = (e: PointerEvent) => { over.current = e.type !== 'pointerleave' && e.pointerType === 'mouse'; };
        const events = ['pointerenter', 'pointermove', 'pointerdown', 'pointerleave'] as const;
        for (const type of events) el.addEventListener(type, update);
        return () => {
            for (const type of events) el.removeEventListener(type, update);
        };
    }, [el, enabled]);
    return over;
}

export function InteractionHandler({ setHovered, setSnap, mouseHoverOnly = false }: InteractionHandlerProps) {
    const { camera, scene, raycaster, pointer, gl } = useThree();
    const lastCheckTime = useRef(0);
    const lastPointer = useRef(new THREE.Vector2(0, 0));
    const mouseOver = useMouseOver(gl.domElement, mouseHoverOnly);
    const cleared = useRef(false);

    useFrame((state) => {
        const now = state.clock.elapsedTime;
        if (now - lastCheckTime.current < 0.05) return;
        lastCheckTime.current = now;
        if (mouseHoverOnly && !mouseOver.current) {
            if (!cleared.current) {
                cleared.current = true;
                setHovered(null);
                setSnap(null);
            }
            return;
        }
        cleared.current = false;
        lastPointer.current.copy(pointer);
        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);

        // In a section/cutaway view the Raycaster still hits geometry that the
        // clipping planes have visually removed; drop those so hover/selection
        // doesn't highlight the cut-away ("invisible") structures.
        const visible = filterClippedIntersections(intersects);

        const best = HoverManager.getBestHover(visible);
        setHovered(best);
        setSnap(SnapManager.getSnapFromHover(best));
    });

    return null;
}
