#!/usr/bin/env sh
# kernelCAD CLI installer for Linux and macOS.
#   curl -fsSL https://kernelcad.com/install.sh | sh
#
# Env:
#   KERNELCAD_VERSION=v0.17.2     pin a release (default: latest)
#   KERNELCAD_INSTALL_DIR=...     directory for the `kernelcad` symlink
#   KERNELCAD_HOME=...            versioned install root
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
fetch_text() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL --retry 3 "$1"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO- "$1"
  else
    die "neither curl nor wget found"
  fi
}
download() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL --retry 3 -o "$2" "$1"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$2" "$1"
  else
    die "neither curl nor wget found"
  fi
}
sha256() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    die "sha256sum or shasum is required to verify the download"
  fi
}

case "$(uname -s)-$(uname -m)" in
  Linux-x86_64|Linux-amd64) PLATFORM="linux-x86_64" ;;
  Linux-aarch64|Linux-arm64) PLATFORM="linux-aarch64" ;;
  Darwin-x86_64) PLATFORM="darwin-x86_64" ;;
  Darwin-arm64) PLATFORM="darwin-arm64" ;;
  *) die "unsupported platform: $(uname -s)-$(uname -m); supported: Linux x86_64/ARM64, macOS x86_64/ARM64" ;;
esac

need tar
need awk
need grep

if [ "$VERSION" = "latest" ]; then
  TAG="$(fetch_text "https://api.github.com/repos/${REPO}/releases/latest" | awk -F '"' '/"tag_name"[[:space:]]*:/ { print $4; exit }')"
  case "$TAG" in
    v[0-9]*.[0-9]*.[0-9]*) VERSION="$TAG" ;;
    *) die "could not resolve the latest release; pin one with KERNELCAD_VERSION=v0.17.2" ;;
  esac
fi
printf '%s\n' "$VERSION" | grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+$' \
  || die "KERNELCAD_VERSION must look like v0.17.2"

ARCHIVE="kernelcad-${VERSION#v}-${PLATFORM}.tar.gz"
BASE_URL="https://github.com/${REPO}/releases/download/${VERSION}"
DEST="${HOME_DIR}/versions/${VERSION}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT HUP INT TERM

info "Installing kernelCAD ${VERSION} (${PLATFORM})"
download "${BASE_URL}/${ARCHIVE}" "$TMP/$ARCHIVE" || die "no archive at ${BASE_URL}/${ARCHIVE}"
download "${BASE_URL}/SHA256SUMS" "$TMP/SHA256SUMS" || die "release is missing SHA256SUMS"

EXPECTED="$(awk -v file="$ARCHIVE" '$2 == file { value = $1; count += 1 } END { if (count != 1) exit 1; print value }' "$TMP/SHA256SUMS")" \
  || die "SHA256SUMS has no unique entry for $ARCHIVE"
ACTUAL="$(sha256 "$TMP/$ARCHIVE")"
[ "$EXPECTED" = "$ACTUAL" ] || die "SHA-256 mismatch for $ARCHIVE"
ok "verified SHA-256"

mkdir -p "$TMP/unpacked"
tar -xzf "$TMP/$ARCHIVE" -C "$TMP/unpacked" --strip-components=1
[ -x "$TMP/unpacked/runtime/node" ] || die "archive does not contain its bundled Node.js runtime"
[ -f "$TMP/unpacked/dist/cli/index.js" ] || die "archive does not contain the kernelCAD CLI"

mkdir -p "$(dirname "$DEST")"
rm -rf "$DEST"
mv "$TMP/unpacked" "$DEST"
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
  kernelcad import-step part.step --out imported
  kernelcad evaluate imported/part.kcad.ts
TXT
