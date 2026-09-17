// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kinematic/register.ts
//
// Registers the five in-process kinematic checks as `modeling/api.ts`'s
// `kinematic.*` facade. This is the browser-safe registration — it pulls in
// only `src/kinematic`'s own dependency graph (no CLI/node-only modules), so
// it is the one the browser script runtime (`site/island/docs-worker.ts`)
// imports.
//
// The agent layer's `src/agent/kinematic/register.ts` registers a superset
// (this object plus `sweepTolerance`, which needs the CLI's evaluate path
// and is therefore node-only) for the CLI/MCP/test entry points. Import this
// file (a side-effect import) once, before any script that reads
// `kinematic.*` runs.

import { registerKinematicFacade } from '../modeling/api';
import * as kinematic from './index';

registerKinematicFacade(kinematic);
