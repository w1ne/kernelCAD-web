// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/browserKernel/kernelWorkerAssets.ts
//
// The browser kernel's two build assets. Loaded with a dynamic import only
// when the browser kernel actually starts, so the embed library (which
// never runs it) and the unit tests never pull the worker bundle or the
// 11 MB wasm in.

import kernelWorkerUrl from './kernel.worker.ts?worker&url';
import occtWasmUrl from 'replicad-opencascadejs/src/replicad_single.wasm?url';

export { kernelWorkerUrl, occtWasmUrl };
