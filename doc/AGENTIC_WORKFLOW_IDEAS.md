# Advanced Agentic Workflow Ideas

The goal is to elevate the AI Assistant from a simple "Code Generator" to a fully integrated "Co-Pilot" similar to the Antigravity agent.

## Core Pillars of Integration

### 1. Unified Context (The "Brain")
Just as I can read your files, the CAD Agent must "read" the current state of the workbench.
-   **Selection Context**: If you select a `Box`, the agent should receive: `Context: { selected: { type: 'Box', id: 'box1', dims: [10,10,10] } }`.
-   **Camera Context**: "Look at this" should use the current camera view/orientation.
-   **Code Context**: The agent should see the *entire* current script to suggest non-breaking edits, not just isolated snippets.

### 2. Agentic Capabilities (The "Hands")
Instead of just returning code strings, the agent should have **Tools**.
-   **`highlight(id)`**: "Show me the box" -> Agent highlights it in the viewport.
-   **`select(selector)`**: "Select all edges of the top face".
-   **`camera.zoomTo(id)`**: "Focus on the screw hole".
-   **`run_command`**: Execute a predefined workflow (e.g., "Export to STL").

### 3. Proactive Assistance
-   **Error Healing**: If the Kernel throws an error, the Agent should automatically analyze the stack trace and propose a fix.
-   **Linting/Optimization**: "This fillet radius is too large for the edge."

### 4. "Artifact" Generation
For complex tasks, the agent should first generate a **Plan** or a **Sketch**.
-   **Plan Mode**: "I will create the base, then extrude the walls, then cut the holes."
-   **Drafting**: The agent could draw on the 2D SketchCanvas before committing to 3D geometry.

## Proposed "Phase 2" Features

### A. Context-Aware Chat
**Implementation**:
-   Inject `getWorkbenchState()` into the System Prompt dynamically.
-   Token-efficient summary of the Scene Graph.

### B. "Click-to-Ask"
**UX**:
-   Right-click on a face in the 3D Viewer -> "Ask AI about this face".
-   Right-click in the Editor -> "Refactor this shape".

### C. The "Agent Loop"
**Observation**:
-   Instead of one-shot generation (`User -> Code`), implement a loop:
    1.  **Thought**: "I need to find the top face."
    2.  **Action**: `api.select({ normal: { z: 1 } })`
    3.  **Observation**: "Found Face 12."
    4.  **Final Answer**: `replicad.makeCylinder(...)`

## User Experience Goal
**User**: "Rounding the edges of this box is causing errors."
**Agent**: *Reads Console Logs, Sees error 'Radius too large'*
**Agent**: "The radius (5mm) is larger than the box width (4mm). I suggest reducing it to 1.9mm. Shall I apply this fix?"
**User**: "Yes."
**Agent**: *Applies code edit.*

### 5. Design Intelligence (The "Artist")
Moving beyond functional CAD to **Aesthetic CAD**.
-   **Style Personas**: The user can set a "Design Language" (e.g., *Bauhaus*, *Cyberpunk*, *Apple-like Minimalist*). The agent adjusts its geometry generation accordingly (e.g., using specific fillet radii, chamfers, or proportions).
-   **Harmonic Proportions**: The agent can enforce Golden Ratio (1.618) or Rule of Thirds on dimensions.
-   **Generative Variations**: "Show me 3 different variations of this handle." The agent generates 3 script variants for the user to pick.

