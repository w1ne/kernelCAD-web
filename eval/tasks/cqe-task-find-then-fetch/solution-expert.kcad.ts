// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Reference solution showing the four-tool discovery chain. The harness
// verifies the script evaluates clean; the agent's MCP tool-call trace
// (when surfaced through the eval runner) verifies the discovery sequence:
//   inspect({ of: 'part-categories' }) -> inspect({ of: 'part-families' }) -> find_part -> fetch_part.

const motor = await lib.fetchPart('nema-17');
return motor;
