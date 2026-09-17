// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/kinematic/register.ts
//
// Registers the full `kinematic.*` facade `modeling/api.ts` injects into
// scripts: the five in-process checks (`src/kinematic`) plus `sweepTolerance`
// (this layer — it needs the CLI's `evaluateAndBuildScript`, which pulls
// node-only modules transitively, so it cannot live in the browser-safe
// `src/kinematic/register.ts`). Import this file (a side-effect import) from
// every node entry point that evaluates a script — the CLI (which the `mcp`
// subcommand runs inside of) and the vitest setup — before any script that
// reads `kinematic.*` runs. `sweepTolerance` is not part of the
// `KinematicFacade` type modeling declares (that interface only covers the
// five checks), so it is attached here as an extra property on the runtime
// object rather than typed on `KinematicFacade`.

import { registerKinematicFacade } from '../../modeling/api';
import * as kinematicChecks from '../../kinematic';
import { sweepTolerance } from './sweepTolerance';

const fullFacade = { ...kinematicChecks, sweepTolerance };
registerKinematicFacade(fullFacade);
