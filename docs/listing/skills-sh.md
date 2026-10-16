# skills.sh

skills.sh lists skills straight from a public GitHub repo. The grouping lives in `skills.sh.json` at the repo root, which already groups `kernelcad-design-loop`, `kernelcad-cookbooks`, `kernelcad-studio-paint` and `kernelcad-export`.

**Install line (README / badge):**
```bash
npx skills add w1ne/kernelCAD-web
```

**Group description** (proposed for `skills.sh.json` → `groupings[0].description`):
> Design, check and export real CAD parts: STEP/STL/drawings, rendered previews, automatic checks. Works with the hosted kernelCAD MCP, no install.

**Per-skill one-liners:**
| Skill | One-liner |
|---|---|
| kernelcad-design-loop | Build a part, review it and fix it until every check is green. |
| kernelcad-cookbooks | Start from proven recipes: brackets, enclosures, gears, mechanisms. |
| kernelcad-studio-paint | Mark up the 3D view and turn the marks into edits. |
| kernelcad-export | STEP, STL, 3MF, GLB, OBJ, USD, DXF and dimensioned PDF drawings, ready for fab. |

Once `dfm_review` / `fab_pack` / `import_step` ship, add a line about them to the export skill.
