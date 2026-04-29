# Agent API Documentation

The **Agent API** exposes the core `HeadlessKernel` to external agents (AI or scripted), allowing them to generate geometry without needing a browser DOM.

## Overview

The system is designed with a "Headless-First" approach. The `AgentAPI` class (`src/agent/AgentAPI.ts`) wraps the `HeadlessKernel` to provide a simplified interface for initialization, command execution, and code evaluation.

## Core Components

### 1. AgentAPI (`src/agent/AgentAPI.ts`)

The main entry point for agent interactions.

```typescript
import { agentAPI } from './agent/AgentAPI';

// Initialize the kernel (loads WASM)
await agentAPI.init();

// Execute a string of code
const result = await agentAPI.evaluateCode(`
    const box = replicad.makeBox(10, 10, 10);
    return box;
`);
```

### 2. HeadlessKernel (`src/kernel/HeadlessKernel.ts`)

An implementation of the `HeadlessContext` interface that runs in a Node.js or Web Worker environment.

-   **`evaluateCode(code: string)`**: Executes the provided JavaScript code in a sandboxed environment.
    -   **Context**: The code has access to `replicad` (the geometry library) and `console`.
    -   **Returns**: An `ExecutionResult` containing the resulting shape, logs, and errors.
-   **`insertCode(snippet)`**: Appends code to the internal buffer and updates the `CodeAnalyzer`.

## Capabilities

The `HeadlessKernel` supports the full **replicad** API.

-   **Geometry Creation**: `makeBox`, `makeCylinder`, `sketch`, etc.
-   **Boolean Operations**: `cut`, `fuse`, `intersect`.
-   **Fillets/Chamfers**: standard edge operations.

## Integration with AI

To build an AI agent:

1.  **System Prompt**: Instruct the LLM to write JavaScript code that uses the `replicad` variable.
2.  **Execution**: Pass the generated code to `agentAPI.evaluateCode()`.
3.  **Feedback**: Return any errors or logs from `ExecutionResult` back to the LLM for self-correction.

```typescript
// Example LLM interaction loop
const code = await llm.generate("Create a cylinder of radius 5");
const result = await agentAPI.evaluateCode(code);

if (result.errors.length > 0) {
    await llm.generate(`The previous code failed with: ${result.errors.join('\n')}. Fix it.`);
}
```
