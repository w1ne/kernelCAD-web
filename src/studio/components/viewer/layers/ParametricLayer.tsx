// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { type ThreeEvent } from "@react-three/fiber";
import { TransformControls } from "@react-three/drei/core/TransformControls";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { useWorkbench } from "../../../context/WorkbenchContext";
import { computeCentroid } from "../../../../shared/sketch/sketchHelpers";

export function ParametricLayer() {
    const { entities, selectedEntityIds, selectEntity, updateEntity, solve } = useWorkbench();
    const entityList = useMemo(() => Array.from(entities.values()), [entities]);

    const selectedPoints = useMemo(() => {
        return selectedEntityIds
            .map(id => entities.get(id))
            .filter(e => e?.type === 'POINT') as { id: string, x: number, y: number, type: 'POINT' }[];
    }, [selectedEntityIds, entities]);

    const centroid = useMemo(() => {
        return computeCentroid(selectedPoints);
    }, [selectedPoints]);

    const [dummy, setDummy] = useState<THREE.Group | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const initialPositions = useRef<Map<string, { x: number, y: number }>>(new Map());
    const initialCentroid = useRef<{ x: number, y: number } | null>(null);

    useEffect(() => {
        if (!isDragging && dummy && centroid) {
            dummy.position.set(centroid.x, centroid.y, 0);
        }
    }, [centroid, isDragging, dummy]);

    return (
        <group>
            {entityList.map(entity => {
                if (entity.type === 'POINT') {
                    const isSelected = selectedEntityIds.includes(entity.id);
                    return (
                        <group key={entity.id} position={[entity.x, entity.y, 0]}>
                            <mesh
                                onClick={(e: ThreeEvent<MouseEvent>) => {
                                    e.stopPropagation();
                                    selectEntity(entity.id, e.metaKey || e.ctrlKey);
                                }}
                                userData={{ type: 'VERTEX', id: entity.id }}
                            >
                                <sphereGeometry args={[isSelected ? 0.8 : 0.5]} />
                                <meshBasicMaterial color={isSelected ? "red" : "yellow"} />
                            </mesh>
                        </group>
                    );
                } else if (entity.type === 'LINE') {
                    const p1 = entities.get(entity.p1);
                    const p2 = entities.get(entity.p2);

                    if (p1 && p1.type === 'POINT' && p2 && p2.type === 'POINT') {
                        const points = [
                            new THREE.Vector3(p1.x, p1.y, 0),
                            new THREE.Vector3(p2.x, p2.y, 0)
                        ];
                        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
                        const isSelected = selectedEntityIds.includes(entity.id);

                        return (
                            <lineSegments
                                key={entity.id}
                                geometry={lineGeo}
                                onClick={(e: ThreeEvent<MouseEvent>) => {
                                    e.stopPropagation();
                                    selectEntity(entity.id, e.metaKey || e.ctrlKey);
                                }}
                                userData={{ type: 'EDGE', id: entity.id }}
                            >
                                <lineBasicMaterial color={isSelected ? "orange" : "cyan"} />
                            </lineSegments>
                        )
                    }
                }
                return null;
            })}

            {centroid && (
                <>
                    <group ref={setDummy} position={[centroid.x, centroid.y, 0]} />
                    {dummy && (
                        <TransformControls
                            object={dummy}
                            mode="translate"
                            showZ={false}
                            size={0.6}
                            translationSnap={0.5}
                            onMouseDown={() => {
                                setIsDragging(true);
                                initialCentroid.current = { x: dummy.position.x, y: dummy.position.y };
                                initialPositions.current.clear();
                                selectedPoints.forEach(p => {
                                    initialPositions.current.set(p.id, { x: p.x, y: p.y });
                                });
                            }}
                            onMouseUp={() => {
                                setIsDragging(false);
                                initialCentroid.current = null;
                            }}
                            onObjectChange={() => {
                                if (isDragging && initialCentroid.current && dummy) {
                                    const currentPos = dummy.position;
                                    const dx = currentPos.x - initialCentroid.current.x;
                                    const dy = currentPos.y - initialCentroid.current.y;
                                    initialPositions.current.forEach((startPos, id) => {
                                        updateEntity(id, { x: startPos.x + dx, y: startPos.y + dy });
                                    });
                                    solve();
                                }
                            }}
                        />
                    )}
                </>
            )}
        </group>
    );
}
