// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { ConstraintSolver } from '../../../modeling/constraints/solver';
import type { Constraint, ConstraintType, SketchEntity } from '../../../modeling/constraints/types';

export const SUPPORTED_CONSTRAINT_TYPES: ConstraintType[] = [
  'COINCIDENT',
  'DISTANCE',
  'HORIZONTAL',
  'VERTICAL',
  'PARALLEL',
  'PERPENDICULAR',
  'EQUAL_LENGTH',
  'TANGENT',
  'RADIUS',
  'ANGLE',
  'CONCENTRIC',
  'SYMMETRIC',
];

const constraintTypes = new Set<string>(SUPPORTED_CONSTRAINT_TYPES);

const CONSTRAINT_ARITY: Record<ConstraintType, { min: number; max: number; valueRequired?: boolean }> = {
  COINCIDENT: { min: 2, max: 2 },
  DISTANCE: { min: 2, max: 2, valueRequired: true },
  HORIZONTAL: { min: 2, max: 2 },
  VERTICAL: { min: 2, max: 2 },
  PARALLEL: { min: 2, max: 2 },
  PERPENDICULAR: { min: 2, max: 2 },
  EQUAL_LENGTH: { min: 2, max: 2 },
  TANGENT: { min: 2, max: 2 },
  RADIUS: { min: 1, max: 1, valueRequired: true },
  ANGLE: { min: 1, max: 2, valueRequired: true },
  CONCENTRIC: { min: 2, max: 2 },
  SYMMETRIC: { min: 3, max: 3 },
};

export interface SolveSketchInput {
  entities?: SketchEntity[];
  constraints?: Constraint[];
}

export type SolveSketchOutput =
  | {
    ok: true;
    entities: SketchEntity[];
    constraints: Constraint[];
  }
  | {
    ok: false;
    errors: string[];
    entities: SketchEntity[];
    constraints: Constraint[];
  };

export interface AddConstraintInput {
  constraints?: Constraint[];
  constraint?: Constraint;
}

export type AddConstraintOutput =
  | { ok: true; constraints: Constraint[] }
  | { ok: false; errors: string[]; constraints: Constraint[] };

export interface ListConstraintsInput {
  constraints?: Constraint[];
}

export interface ListConstraintsOutput {
  ok: true;
  supportedTypes: ConstraintType[];
  constraints: Constraint[];
}

export async function solveSketchTool(input: SolveSketchInput = {}): Promise<SolveSketchOutput> {
  const shapeErrors = validateListInputs(input);
  if (shapeErrors.length > 0) {
    return { ok: false, errors: shapeErrors, entities: [], constraints: [] };
  }

  const entities = cloneEntities(input.entities ?? []);
  const constraints = cloneConstraints(input.constraints ?? []);
  const errors = validateEntities(entities);
  errors.push(...validateConstraints(constraints, new Map(entities.map(entity => [entity.id, entity]))));

  if (errors.length > 0) {
    return { ok: false, errors, entities, constraints };
  }

  const entityMap = new Map(entities.map(entity => [entity.id, entity]));
  new ConstraintSolver().solve({ entities: entityMap, constraints });

  return {
    ok: true,
    entities: entities.map(entity => entityMap.get(entity.id) ?? entity),
    constraints,
  };
}

export async function addConstraintTool(input: AddConstraintInput = {}): Promise<AddConstraintOutput> {
  if (input.constraints !== undefined && !Array.isArray(input.constraints)) {
    return { ok: false, errors: ['constraints must be an array.'], constraints: [] };
  }

  const constraints = cloneConstraints(input.constraints ?? []);
  if (!input.constraint) {
    return { ok: false, errors: ['Missing required constraint.'], constraints };
  }

  const constraint = cloneConstraint(input.constraint);
  const errors = validateConstraintShape(constraint);
  if (constraints.some(existing => existing.id === constraint.id)) {
    errors.push(`Duplicate constraint id "${constraint.id}".`);
  }

  if (errors.length > 0) {
    return { ok: false, errors, constraints };
  }

  return { ok: true, constraints: [...constraints, constraint] };
}

export async function listConstraintsTool(input: ListConstraintsInput = {}): Promise<ListConstraintsOutput> {
  return {
    ok: true,
    supportedTypes: [...SUPPORTED_CONSTRAINT_TYPES],
    constraints: Array.isArray(input.constraints) ? cloneConstraints(input.constraints) : [],
  };
}

function validateListInputs(input: SolveSketchInput): string[] {
  const errors: string[] = [];
  if (input.entities !== undefined && !Array.isArray(input.entities)) {
    errors.push('entities must be an array.');
  }
  if (input.constraints !== undefined && !Array.isArray(input.constraints)) {
    errors.push('constraints must be an array.');
  }
  return errors;
}

function validateEntities(entities: SketchEntity[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const entity of entities) {
    if (!entity.id) {
      errors.push('Entity id is required.');
      continue;
    }
    if (ids.has(entity.id)) {
      errors.push(`Duplicate entity id "${entity.id}".`);
    }
    ids.add(entity.id);
  }

  const entityMap = new Map(entities.map(entity => [entity.id, entity]));
  for (const entity of entities) {
    if (entity.type === 'LINE') {
      validatePointReference(entityMap, entity.id, 'p1', entity.p1, errors);
      validatePointReference(entityMap, entity.id, 'p2', entity.p2, errors);
    } else if (entity.type === 'CIRCLE') {
      validatePointReference(entityMap, entity.id, 'center', entity.center, errors);
    }
  }

  return errors;
}

function validatePointReference(
  entityMap: Map<string, SketchEntity>,
  entityId: string,
  field: string,
  pointId: string,
  errors: string[],
): void {
  const point = entityMap.get(pointId);
  if (!point) {
    errors.push(`Entity "${entityId}" ${field} references missing point "${pointId}".`);
  } else if (point.type !== 'POINT') {
    errors.push(`Entity "${entityId}" ${field} must reference a POINT, got "${point.type}".`);
  }
}

function validateConstraints(
  constraints: Constraint[],
  entityMap: Map<string, SketchEntity>,
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const constraint of constraints) {
    errors.push(...validateConstraintShape(constraint));
    if (ids.has(constraint.id)) {
      errors.push(`Duplicate constraint id "${constraint.id}".`);
    }
    ids.add(constraint.id);

    for (const entityId of constraint.entities ?? []) {
      if (!entityMap.has(entityId)) {
        errors.push(`Constraint "${constraint.id}" references missing entity "${entityId}".`);
      }
    }
  }

  return errors;
}

function validateConstraintShape(constraint: Constraint): string[] {
  const errors: string[] = [];
  if (!constraint.id) errors.push('Constraint id is required.');
  if (!constraintTypes.has(constraint.type)) {
    errors.push(`Unsupported constraint type "${String(constraint.type)}".`);
    return errors;
  }

  const arity = CONSTRAINT_ARITY[constraint.type];
  const entityCount = constraint.entities?.length ?? 0;
  if (entityCount < arity.min || entityCount > arity.max) {
    const expected = arity.min === arity.max ? `${arity.min}` : `${arity.min}-${arity.max}`;
    errors.push(`Constraint "${constraint.id}" type ${constraint.type} expects ${expected} entities, got ${entityCount}.`);
  }
  if (arity.valueRequired && typeof constraint.value !== 'number') {
    errors.push(`Constraint "${constraint.id}" type ${constraint.type} requires numeric value.`);
  }

  return errors;
}

function cloneEntities(entities: SketchEntity[]): SketchEntity[] {
  return entities.map(entity => ({ ...entity }));
}

function cloneConstraints(constraints: Constraint[]): Constraint[] {
  return constraints.map(cloneConstraint);
}

function cloneConstraint(constraint: Constraint): Constraint {
  return {
    ...constraint,
    entities: [...(constraint.entities ?? [])],
  };
}
