# Sandbox mode

Sandbox mode is for regulated and air-gapped deployments. It keeps the local
kernelCAD CLI and the local MCP server inside one workspace directory and
refuses outbound network at runtime.

```sh
kernelcad --sandbox export step plate.kcad.ts -o out/plate.step   # one command
kernelcad mcp --sandbox --workspace /srv/cad                       # MCP server
KERNELCAD_SANDBOX=1 KERNELCAD_WORKSPACE=/srv/cad kernelcad mcp     # same, by env
kernelcad --sandbox sandbox status                                 # what is enforced
```

`--sandbox` and `--workspace <dir>` work before or after any subcommand.
`--workspace` implies `--sandbox`. The settings reach child processes through
the environment, including the larger-heap re-exec used by mesh-heavy commands.

| Setting | Meaning |
| --- | --- |
| `KERNELCAD_SANDBOX=1` / `--sandbox` | Turn sandbox mode on. |
| `KERNELCAD_WORKSPACE=<dir>` / `--workspace <dir>` | Workspace root. The default is the current directory. It must already exist. |
| `KERNELCAD_SANDBOX_ALLOW_LOOPBACK=1` | Allow connections to `127.0.0.0/8`, `::1` and `localhost`. Off by default. |
| `KERNELCAD_SANDBOX_READ_PATHS=<dir>[:<dir>…]` | Extra directories the runtime may read but not write, for example a shared font or STEP library. |

## What is enforced

### Files

Every path is checked on its real location:

1. `~` expands to the home directory. `file:` URLs and Buffers become paths.
   Relative paths resolve against the current directory.
2. `.` and `..` are collapsed.
3. Symlinks are followed in every component that exists, including a dangling
   final link. A link inside the workspace that points outside it is refused,
   even before its target exists.
4. Read and write access is allowed under the workspace root. Read-only
   access is allowed under the runtime roots: the kernelCAD package and its
   `node_modules`, the Playwright browser cache, the Node binary directory,
   `PATH` directories (so helper binaries such as `ffmpeg` can be found), and
   `KERNELCAD_SANDBOX_READ_PATHS`. `/dev/null`, `/dev/urandom` and the standard
   streams are also allowed. Everything else is refused.

The check runs at three layers that share one decision
(`src/shared/sandbox/pathGuard.ts`):

- **MCP arguments.** `callMcpTool` checks every path- and URL-taking argument
  before the handler runs. This covers `file`, `output_path`, `out_dir`,
  `output_dir`, `frames_dir`, `ledgerPath`, `urdf_path`, `design_loop`
  attempts and screenshots, mesh operands, fonts and URLs. The table is
  `MCP_SANDBOX_ARGS` in `src/agent/mcp/sandboxArgs.ts`. An audit test walks
  every registered tool schema and fails if a path-like argument is missing
  from the table.
- **CLI arguments.** A single commander `preAction` hook checks the
  positionals and options of whichever subcommand is about to run. The table
  is `CLI_SANDBOX_ARGS` in `src/agent/cli/lib/sandboxCli.ts`, and it has the
  same kind of audit test.
- **The `node:fs` chokepoint.** This backstop catches paths that a tool
  derives itself, such as default temp directories, sibling ledgers, caches
  and files read by a script. Every path-taking function of `node:fs` and
  `node:fs/promises` (sync, callback, promise and stream forms) is wrapped
  once, and the ESM named exports are re-synced, so
  `import { writeFileSync } from 'node:fs'` is guarded too. Script asset
  paths (`lib.fromSTEP`, `fromSTL`, `fromDXF`, `referenceImage`, fonts and
  textures) are also refused earlier, at the script path resolver, so the
  author gets a clear diagnostic and not a generic "cannot read file".

Scratch locations move into the workspace. `TMPDIR` (and therefore
`os.tmpdir()`), `KERNELCAD_CACHE_DIR` and `KERNELCAD_CONFIG_HOME` point under
`<workspace>/.kernelcad-sandbox/`. Default output directories for
`render_preview`, `import_step`, `run_fea`, `run_cfd` and `diff_geometry` are created
there. You can delete that directory at any time.

### Network

All outbound traffic from the kernelCAD process is refused, and the refusal
happens before any packet leaves:

- `net.Socket.prototype.connect` is wrapped. This is the floor for http,
  https, http2, tls, the undici client behind global `fetch` and `WebSocket`,
  and any npm HTTP client. A refused socket errors on the next tick, so
  nothing hangs.
- Global `fetch` rejects at once with the sandbox diagnostic.
- `http.request/get` and `https.request/get` throw before a socket exists.
- DNS queries are refused (`dns.resolve*`, `dns.reverse`, and `dns.lookup`
  of real hostnames). A lookup of an IP literal or `localhost` is still
  allowed because it never reaches a resolver.
- UDP sends (`dgram`) are refused.
- Unix-socket and named-pipe connects are refused.
- The standard proxy variables point at a closed local port, and `NO_PROXY`
  is cleared, so well-behaved helper processes also fail fast.
- Telemetry is forced off and the first-run notice is skipped. The remote
  parts tier is set to `off`.

**Localhost policy.** Loopback is refused like any other destination by
default, because a local forwarding proxy is one hop from the internet. Set
`KERNELCAD_SANDBOX_ALLOW_LOOPBACK=1` to allow it, for example to use a local
Studio dev server. Listening sockets are inbound and are not affected. The MCP
live viewer and the headless-render player server keep working and bind
`127.0.0.1` only.

**Headless Chromium** (render, inspect, animation capture) is a child process,
so it gets its own lock-down in the one shared browser bootstrap:

- It never attaches to a running Chrome over CDP.
- It launches with host-resolver rules that resolve every hostname except
  loopback to nothing, and with a proxy that goes nowhere.
- It runs with background networking, component updates and sync disabled.
- Every request is intercepted, and anything that is not the loopback player
  server (or `data:`/`blob:`) is aborted.

Bundled HDRI presets work. A URL `environment` is refused.

### Commands and tools that need the network

| Refused outright | Why |
| --- | --- |
| `kernelcad mcp --cloud` | Proxies every call to the hosted API. |
| `kernelcad stats` | Admin telemetry API. |
| `kernelcad print send`, MCP `send_to_printer` | Uploads to a network printer. |
| `kernelcad install` | Writes MCP client configs in your home directory and runs other agent CLIs. |
| `kernelcad telemetry enable` / `reset` | Telemetry is forced off. |

Network **modes** of other tools are refused per argument. Their offline
modes keep working:

| Refused mode | Offline equivalent |
| --- | --- |
| `import_step` `url` / `upload` | `content_base64`, or a file in the workspace with `kernelcad import-step` |
| `fetch_part` / `find_part` `partsBaseUrl`, `fetch_part` `model.url` | The bundled catalog, or `lib.fromSTEP('vendor/part.step')` from the workspace |
| `trace_from_image` with an `http(s)` image | A workspace path or a `data:` URL |
| `render_preview` / `kernelcad render --base-url`, URL `environment` | The bundled player and HDRI presets |
| `get_selection` / `set_selection` / `ray_pick` `studio_url` | Allowed only with `KERNELCAD_SANDBOX_ALLOW_LOOPBACK=1` |

## How refusals look

Every refusal uses a code registered in the diagnostic registry
(`src/shared/diagnostics/registry/cli.ts`). With `--json`, the CLI prints the
refusal as a diagnostic object:

| Code | When |
| --- | --- |
| `cli.sandbox-path-denied` | A path resolves outside the workspace, or a write targets a read-only root. |
| `cli.sandbox-network-denied` | A connection, fetch, DNS query or URL argument was refused. |
| `cli.sandbox-command-refused` | The command, tool or server mode is online-only. |

```text
$ kernelcad --sandbox export step plate.kcad.ts -o ../plate.step
ERROR [cli.sandbox-path-denied] kernelcad export: --out — got "../plate.step"; requires a path
inside the sandbox workspace /srv/cad (it resolves to /srv/plate.step). Example: ...
```

The CLI exits with code 2. MCP tools return `isError: true` with
`{ ok: false, error, errorCode, hint, nextAction, sandbox }`.

## How an agent learns the constraints

- `initialize` returns `serverInfo.title = "kernelCAD (sandbox mode)"` and
  `instructions` that name the workspace, the network policy and the offline
  alternatives.
- In `tools/list`, each affected tool's description ends with a
  `SANDBOX MODE:` line that names its path arguments and refused URL
  arguments.
- `kernelcad sandbox status [--json]` reports the workspace, scratch
  directories, read-only roots, network, loopback and telemetry policy.
  `kernelcad sandbox check <path> [--write]` tests a single path.

## Limits

Sandbox mode is an in-process guard. Its threat model is a well-meaning agent
or script that must not leak data or reach outside the workspace. It does not
replace OS isolation against hostile native code. These are not covered by the
in-process guard:

- Child processes other than Chromium (`ffmpeg`, CalculiX/gmsh, OpenFOAM (native,
  or a Docker container that always runs with `--network none`), slicer CLIs,
  `git` for `collab check`). They inherit the sandbox environment, including
  the dead proxy, `TMPDIR` and `KERNELCAD_SANDBOX=1`, but not the patched
  modules.
- Native addons that do their own I/O.
- File descriptors opened before the guard was installed. The CLI installs it
  as its first import, so in practice there are none.
- Check-then-use races on paths that an attacker changes concurrently.

For hard isolation, also run the process with no network namespace
(`docker run --network none`, `unshare -n`, or a client-side MCP sandbox)
and a read-only bind mount of everything except the workspace. Sandbox mode
then gives agents structured, explainable refusals inside that boundary,
instead of opaque `EACCES` errors or hung sockets.
