// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Assembly } from '../../../modeling/capture/assembly';
import { loadMujocoSession } from '../../../modeling/runtime/mujocoSession';
import { runAssemblyContactDynamics, type AssemblyContactDynamicsResult } from '../../../modeling/runtime/assemblyContactDynamics';
import type { ContactDynamicsStudyInput } from '../../../modeling/runtime/contactDynamics';

export type CheckContactDynamicsOutput = AssemblyContactDynamicsResult;

export function checkContactDynamics(arm: Assembly, input: ContactDynamicsStudyInput): Promise<CheckContactDynamicsOutput> {
    return runAssemblyContactDynamics(arm, input, loadMujocoSession);
}
