# Official MCP Registry

Registry: https://registry.modelcontextprotocol.io. Quickstart: https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/quickstart.mdx

[server.json](server.json) in this folder is the registry copy. The root `server.json` matches it (0.17.0, remote only).

Rules this file follows:
- `name` `com.kernelcad/kernelcad` matches `mcpName` in package.json, which the registry requires for the npm package.
- `description` is 91 characters. The registry rejects anything over 100 (`422 expected length <= 100`).
- A `com.kernelcad/*` namespace needs proof that you own kernelcad.com, by a DNS TXT record or an HTTP `/.well-known` file. That proof covers the namespace only. The remote URL doesn't have to be on the same domain, although `mcp.kernelcad.com` is.
- The npm package entry is left out until 0.17.0 is published. When you add it back, pass `packageArguments: [{type: positional, value: mcp}]` so a client runs `npx kernelcad mcp` (the stdio server) and not the general CLI.

## Publish
```bash
# at release time, after npm publish of the same version
cp docs/listing/server.json server.json        # bump both versions to the released one
mcp-publisher login dns --domain kernelcad.com --private-key <key>   # or: login http
mcp-publisher publish
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=com.kernelcad/kernelcad"
```

Note that the MCP Registry doesn't make kernelCAD show up inside Claude or ChatGPT. Those directories are separate (see the other files).
