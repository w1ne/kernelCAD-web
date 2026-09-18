// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { CaptureSession } from './captureSession';
import type { MateCouplingRecord } from '../mates/coupledPoses';
import type { MateRecord } from '../mates/mate';
import type { TendonRecord } from '../mates/tendon';
import type { WorkspaceTargetRecord } from '../mates/workspaceTarget';
import type { PhysicalUseCaseRecord } from '../mates/physicalUseCase';
import type { PartLineageMap } from '../../kernel/naming/evolutionRecord';
import type {
  AssemblyJointStored,
  AssemblyPartStored,
  DisabledCollisionRecord,
  EndEffectorRecord,
  GroupStateRecord,
  JointSupportIntentRecord,
  MechanicalJointIntentRecord,
  PlanningGroupRecord,
  TransmissionIntentRecord,
  VirtualJointRecord,
} from './assemblyTypes';

/**
 * Internal, mutable state carried by a single `Assembly` instance. Owned as
 * one `private readonly state: AssemblyState` field on the class (see
 * `assembly.ts`) rather than 19 separate private fields, so the plain
 * functions in `assemblyJoints.ts` / `assemblyIntents.ts` /
 * `assemblySolve.ts` / `assemblyModel.ts` / `assemblyParts.ts` that implement
 * `Assembly`'s method bodies can take `this.state` directly — no cast, no
 * field becomes public on the class. Deliberately NOT re-exported from
 * `assembly.ts` (unlike `assemblyTypes.ts`), so it never widens
 * `Assembly`'s public export surface.
 */
export interface AssemblyState {
  readonly name: string;
  readonly session: CaptureSession;
  readonly parts: AssemblyPartStored[];
  readonly partLineage: PartLineageMap;
  readonly joints: AssemblyJointStored[];
  readonly mates: MateRecord[];
  readonly mateCouplings: MateCouplingRecord[];
  readonly tendons: TendonRecord[];
  readonly mechanicalJointIntents: MechanicalJointIntentRecord[];
  readonly jointSupportIntents: JointSupportIntentRecord[];
  readonly transmissionIntents: TransmissionIntentRecord[];
  readonly physicalUseCases: PhysicalUseCaseRecord[];
  readonly workspaceTargets: WorkspaceTargetRecord[];
  readonly planningGroups: PlanningGroupRecord[];
  readonly endEffectors: EndEffectorRecord[];
  readonly virtualJoints: VirtualJointRecord[];
  readonly groupStates: GroupStateRecord[];
  readonly disabledCollisions: DisabledCollisionRecord[];
  ignoreInterferenceList: ReadonlyArray<readonly [string, string]>;
}

/** Fresh, empty `AssemblyState` for a newly constructed `Assembly`. */
export function createAssemblyState(name: string, session: CaptureSession): AssemblyState {
  return {
    name,
    session,
    parts: [],
    partLineage: new Map(),
    joints: [],
    mates: [],
    mateCouplings: [],
    tendons: [],
    mechanicalJointIntents: [],
    jointSupportIntents: [],
    transmissionIntents: [],
    physicalUseCases: [],
    workspaceTargets: [],
    planningGroups: [],
    endEffectors: [],
    virtualJoints: [],
    groupStates: [],
    disabledCollisions: [],
    ignoreInterferenceList: [],
  };
}
