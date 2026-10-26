#!/usr/bin/env sh
# kernelCAD CLI installer.
#   curl -fsSL https://kernelcad.com/install.sh | sh
#
# Env:
#   KERNELCAD_VERSION=v0.17.2     pin a release (default: latest)
#   KERNELCAD_INSTALL_DIR=...     directory for the `kernelcad` symlink
#   KERNELCAD_NO_MODIFY_PATH=1    never touch shell rc files
set -eu

REPO="w1ne/kernelCAD-web"
VERSION="${KERNELCAD_VERSION:-latest}"
INSTALL_DIR="${KERNELCAD_INSTALL_DIR:-$HOME/.local/bin}"
HOME_DIR="${KERNELCAD_HOME:-$HOME/.kernelcad}"
PLATFORM=""

info() { printf '  %s\n' "$*"; }
ok()   { printf '  ✓ %s\n' "$*"; }
die()  { printf '  ✗ %s\n' "$*" >&2; exit 1; }

need() { command -v "$1" >/dev/null 2>&1 || die "required command not found: $1"; }
download() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL --retry 3 -o "$2" "$1"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$2" "$1"
  else
    die "neither curl nor wget found"
  fi
}

case "$(uname -s)-$(uname -m)" in
  Linux-x86_64|Linux-amd64) PLATFORM="linux-x86_64" ;;
  Linux-aarch64|Linux-arm64) PLATFORM="linux-aarch64" ;;
  Darwin-x86_64) PLATFORM="darwin-x86_64" ;;
  Darwin-arm64) PLATFORM="darwin-arm64" ;;
  *) die "unsupported platform: $(uname -s)-$(uname -m)" ;;
esac

need tar
need node
NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
[ "$NODE_MAJOR" -ge 20 ] || die "Node.js 20 or newer is required (found $(node -v))"

if [ "$VERSION" = "latest" ]; then
  TAG="$(curl -fsSLI -o /dev/null -w '%{url_effective}' "https://github.com/${REPO}/releases/latest" 2>/dev/null | sed 's#.*/tag/##' || true)"
  case "$TAG" in
    v[0-9]*.[0-9]*.[0-9]*) VERSION="$TAG" ;;
    *) die "could not resolve the latest release; pin one with KERNELCAD_VERSION=v0.17.2" ;;
  esac
fi
case "$VERSION" in
  v[0-9]*.[0-9]*.[0-9]*) : ;;
  *) die "KERNELCAD_VERSION must look like v0.17.2" ;;
esac

ARCHIVE="kernelcad-${VERSION#v}-${PLATFORM}.tar.gz"
URL="https://github.com/${REPO}/releases/download/${VERSION}/${ARCHIVE}"
DEST="${HOME_DIR}/versions/${VERSION}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

info "Installing kernelCAD ${VERSION} (${PLATFORM})"
download "$URL" "$TMP/$ARCHIVE" || die "no archive at $URL"
rm -rf "$DEST"
mkdir -p "$DEST"
tar -xzf "$TMP/$ARCHIVE" -C "$DEST" --strip-components=1

mkdir -p "$INSTALL_DIR"
rm -f "$INSTALL_DIR/kernelcad"
cat > "$INSTALL_DIR/kernelcad" <<WRAPPER
#!/usr/bin/env sh
exec "$DEST/bin/kernelcad" "\$@"
WRAPPER
chmod +x "$INSTALL_DIR/kernelcad"
ok "kernelcad -> $INSTALL_DIR/kernelcad"

case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *)
    if [ "${KERNELCAD_NO_MODIFY_PATH:-0}" != "1" ]; then
      for rc in "$HOME/.profile" "$HOME/.bashrc" "$HOME/.zshrc"; do
        [ -f "$rc" ] || continue
        grep -q 'kernelCAD CLI' "$rc" 2>/dev/null || printf '\n# kernelCAD CLI\nexport PATH="%s:$PATH"\n' "$INSTALL_DIR" >> "$rc"
      done
    fi
    info "Add this to your shell if needed: export PATH=\"$INSTALL_DIR:\$PATH\""
    ;;
esac

"$INSTALL_DIR/kernelcad" --version >/dev/null 2>&1 || "$INSTALL_DIR/kernelcad" --help >/dev/null 2>&1 || die "kernelcad installed but did not start"
ok "kernelCAD is ready"

cat <<TXT

Use it with an agent (pick one):
  Claude Code (hosted)  claude mcp add --transport http kernelcad https://mcp.kernelcad.com/mcp
  Claude Code (local)   claude mcp add kernelcad -- kernelcad mcp
  Codex (local)         codex mcp add kernelcad -- kernelcad mcp
  Gemini CLI (local)    gemini mcp add kernelcad kernelcad mcp
  ChatGPT / Claude web  add https://mcp.kernelcad.com/mcp as a connector

Run locally:
  kernelcad evaluate model.kcad.ts
  kernelcad mcp
TXT
