# mcp.so

Submit at https://mcp.so (the *Submit* button). The submission asks for the real MCP endpoint. Check the current terms when you submit, because the listing may be paid.

| Field | Value |
|---|---|
| Name | kernelCAD |
| URL / endpoint | `https://mcp.kernelcad.com/mcp` |
| Type | Remote (streamable HTTP); also local via `npx -y kernelcad mcp` |
| Repo | https://github.com/w1ne/kernelCAD-web |
| Tags | cad, 3d, step, stl, 3d-printing, cnc, engineering, drawings |

**Description:**
> Hosted parametric CAD that already works in ChatGPT and Claude, with no install and no account needed to try. Describe a part and get an editable B-rep model shown in 3D in the chat, checked automatically (interference, watertightness, FDM/CNC manufacturability). Export STEP, STL, 3MF, GLB, DXF and dimensioned PDF drawings, or import your own STEP/STL.

**Config snippet:**
```json
{
  "mcpServers": {
    "kernelcad": { "url": "https://mcp.kernelcad.com/mcp" }
  }
}
```
