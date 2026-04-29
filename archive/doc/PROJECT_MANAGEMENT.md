# Project Management in kernelCAD

kernelCAD provides robust ways to manage your CAD projects, ensuring your work is persistent and portable.

## .kcad File Format

Projects are saved in a custom `.kcad` format, which is a JSON-based file containing:
- **Version**: Format version (currently `1.0`).
- **Code**: The complete KCL/JavaScript CAD code.
- **ViewState**: Current UI state (View mode, 3D mode, panel visibility).
- **Metadata**: Name and last updated timestamp.

### Example Schema
```json
{
  "version": "1.0",
  "name": "My Project",
  "code": "const box = show(makeBox(10, 10, 10));",
  "viewState": {
    "viewMode": "gui",
    "viewMode3D": "shadedWithEdges",
    "sidePanelVisible": true,
    "showSketches": true
  },
  "lastUpdated": "2026-02-09T10:00:00Z"
}
```

## Persistence Modes

### 1. Local Persistence (Auto-save)
kernelCAD automatically persists your active work to the browser's `localStorage`.
- **Auto-save**: Your work is saved whenever you make changes (debounced by 1 second).
- **Auto-load**: When you refresh the page or return to the app, your previous state is automatically restored.
- **Scope**: Local storage is specific to your browser and device.

### 2. File-based Export (.kcad)
For portability and backups, you can export your project to a file.
- **Export**: Click the **Save Project (.kcad)** button (File icon) in the header.
- **Import**: Click the **Open Project (.kcad)** button (Folder icon) in the header.

## Exporting to Other Formats
In addition to `.kcad`, kernelCAD supports industry-standard exports:
- **STEP**: For manufacturing and interoperability with other CAD systems.
- **STL**: For 3D printing.

These are available via the export icons in the right side of the header.
