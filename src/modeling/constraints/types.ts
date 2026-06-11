// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
export type EntityType = 'POINT' | 'LINE' | 'CIRCLE';

export interface Point {
    id: string;
    type: 'POINT';
    x: number;
    y: number;
    fixed: boolean; // If true, solver won't move this point (unless dragging)
}

export interface Line {
    id: string;
    type: 'LINE';
    p1: string; // ID of start point
    p2: string; // ID of end point
}

export interface Circle {
    id: string;
    type: 'CIRCLE';
    center: string; // ID of center point
    radius: number;
}

export type SketchEntity = Point | Line | Circle;

export type ConstraintType =
    | 'COINCIDENT'
    | 'DISTANCE'
    | 'HORIZONTAL'
    | 'VERTICAL'
    | 'PARALLEL'
    | 'PERPENDICULAR'
    | 'EQUAL_LENGTH'
    | 'TANGENT'
    | 'RADIUS'
    | 'ANGLE'
    | 'CONCENTRIC'
    | 'SYMMETRIC';

export interface Constraint {
    id: string;
    type: ConstraintType;
    entities: string[]; // IDs of entities involved
    value?: number; // For distance, radius, angle, etc.
}

export interface SolverState {
    entities: Map<string, SketchEntity>;
    constraints: Constraint[];
}
