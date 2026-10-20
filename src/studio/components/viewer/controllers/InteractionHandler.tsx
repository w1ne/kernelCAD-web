// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useEffect, useRef } from "react";
import { HoverManager, type HoverResult } from "../../../features-ui/interaction/HoverManager";
import { SnapManager, type SnapResult } from "../../../features-ui/interaction/SnapManager";
import { filterClippedIntersections } from "../clipFilter";
import { pointerIsOver } from "./pointerOver";
import { edgeRaycastThreshold } from "./edgeRaycastThreshold";

interface InteractionHandlerProps {
    setHovered: (h: HoverResult | null) => void;
    setSnap: (s: SnapResult | null) => void;
}

function usePointerOver(el: HTMLElement) {
    const over = useRef(false);
    useEffect(() => {
        const update = (e: PointerEvent) => { over.current = pointerIsOver(over.current, e); };
        const events = ['pointerenter', 'pointermove', 'pointerdown', 'pointerup', 'pointercancel', 'pointerleave'] as const;
        for (const type of events) el.addEventListener(type, update);
        return () => {
            for (const type of events) el.removeEventListener(type, update);
        };
    }, [el]);
    return over;
}

export function InteractionHandler({ setHovered, setSnap }: InteractionHandlerProps) {
    const { camera, scene, raycaster: eventRaycaster, pointer, gl } = useThree();
    const raycaster = useRef(new THREE.Raycaster());
    const lastCheckTime = useRef(0);
    const lastPointer = useRef(new THREE.Vector2(0, 0));
    const pointerOver = usePointerOver(gl.domElement);
    const cleared = useRef(false);

    useFrame((state) => {
        const now = state.clock.elapsedTime;
        if (now - lastCheckTime.current < 0.05) return;
        lastCheckTime.current = now;
        if (!pointerOver.current) {
            if (!cleared.current) {
                cleared.current = true;
                setHovered(null);
                setSnap(null);
            }
            return;
        }
        cleared.current = false;
        lastPointer.current.copy(pointer);
        const lineThreshold = edgeRaycastThreshold(camera, gl.domElement.clientHeight);
        raycaster.current.setFromCamera(pointer, camera);
        raycaster.current.params.Line.threshold = lineThreshold;
        raycaster.current.params.Points.threshold = 0.2;
        const intersects = raycaster.current.intersectObjects(scene.children, true);
        // R3F uses this same mutable raycaster for pointer events. Keep its
        // line target in step with HoverManager's pixel-scaled edge target.
        // eslint-disable-next-line react-hooks/immutability -- Three.js raycaster params are deliberately mutable in the render loop.
        eventRaycaster.params.Line.threshold = lineThreshold;

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
