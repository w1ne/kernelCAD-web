# kernelCAD extension

The `kernelcad` MCP server is hosted at https://mcp.kernelcad.com/mcp; no local
CAD install is needed. For CAD requests: search `lookup_cookbook` first, write
`.kcad.ts` source, check it with `evaluate_script` and `design_loop` until green,
show it once with `open_in_studio`, and export with `export`. The bundled skills
in `skills/` (`kernelcad-design-loop`, `kernelcad-cookbooks`,
`kernelcad-studio-paint`, `kernelcad-export`) have the details.
