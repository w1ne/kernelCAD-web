// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useRef } from "react";
import { HoverManager, type HoverResult } from "../../../features-ui/interaction/HoverManager";
import { SnapManager, type SnapResult } from "../../../features-ui/interaction/SnapManager";
import { filterClippedIntersections } from "../clipFilter";

interface InteractionHandlerProps {
    setHovered: (h: HoverResult | null) => void;
    setSnap: (s: SnapResult | null) => void;
}

export function InteractionHandler({ setHovered, setSnap }: InteractionHandlerProps) {
    const { camera, scene, raycaster, pointer } = useThree();
    const lastCheckTime = useRef(0);
    const lastPointer = useRef(new THREE.Vector2(0, 0));

    useFrame((state) => {
        const now = state.clock.elapsedTime;
        if (now - lastCheckTime.current < 0.05) return;
        lastCheckTime.current = now;
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
