# Official MCP Registry

Registry: https://registry.modelcontextprotocol.io. Quickstart: https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/quickstart.mdx

[server.json](server.json) in this folder is the proposed replacement for the stale root `server.json` (0.13.0).

Rules this file follows:
- `name` `com.kernelcad/kernelcad` matches `mcpName` in package.json, which the registry requires for the npm package.
- `description` is 91 characters. The registry rejects anything over 100 (`422 expected length <= 100`).
- With a `com.kernelcad/*` namespace, the remote URLs have to be on kernelcad.com or one of its subdomains. `mcp.kernelcad.com` qualifies.
- The registry proves you own the domain with a DNS TXT record or an HTTP `/.well-known` file on kernelcad.com.

## Publish
```bash
# at release time, after npm publish of the same version
cp docs/listing/server.json server.json        # bump both versions to the released one
mcp-publisher login dns --domain kernelcad.com --private-key <key>   # or: login http
mcp-publisher publish
curl "https://registry.modelcontextprotocol.io/v0/servers?search=com.kernelcad/kernelcad"
```

Note that the MCP Registry doesn't make kernelCAD show up inside Claude or ChatGPT. Those directories are separate (see the other files).
