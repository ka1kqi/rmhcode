#!/usr/bin/env bash
# rmhcode installer
# Usage: curl -fsSL https://raw.githubusercontent.com/ka1kqi/rmhcode/main/install.sh | bash

set -euo pipefail

# ── Config ───────────────────────────────────────────────────────────────
REPO="https://github.com/ka1kqi/rmhcode.git"
INSTALL_DIR="${RMHCODE_INSTALL_DIR:-$HOME/.rmhcode}"
BIN_DIR="${RMHCODE_BIN_DIR:-$HOME/.local/bin}"

# ── Colors ───────────────────────────────────────────────────────────────
BLUE='\033[38;2;71;150;228m'
PURPLE='\033[38;2;132;122;206m'
PINK='\033[38;2;195;103;127m'
DIM='\033[2m'
BOLD='\033[1m'
RED='\033[31m'
GREEN='\033[32m'
RESET='\033[0m'

info()  { printf "${BLUE}>${RESET} %s\n" "$*"; }
ok()    { printf "${GREEN}✓${RESET} %s\n" "$*"; }
err()   { printf "${RED}✗ %s${RESET}\n" "$*" >&2; }
fatal() { err "$@"; exit 1; }

# ── Banner ───────────────────────────────────────────────────────────────
print_banner() {
  printf "\n"
  printf "${BLUE} ██╗    ${BLUE}██████╗ ${PURPLE}███╗   ███╗${PURPLE}██╗  ██╗${PINK} ██████╗ ${PINK}██████╗ ${PINK}██████╗ ${PINK}███████╗${RESET}\n"
  printf "${BLUE} ░██╗   ${BLUE}██╔══██╗${PURPLE}████╗ ████║${PURPLE}██║  ██║${PINK}██╔════╝${PINK}██╔═══██╗${PINK}██╔══██╗${PINK}██╔════╝${RESET}\n"
  printf "${BLUE}  ░██╗  ${BLUE}██████╔╝${PURPLE}██╔████╔██║${PURPLE}███████║${PINK}██║     ${PINK}██║   ██║${PINK}██║  ██║${PINK}█████╗  ${RESET}\n"
  printf "${BLUE}  ██╔╝  ${BLUE}██╔══██╗${PURPLE}██║╚██╔╝██║${PURPLE}██╔══██║${PINK}██║     ${PINK}██║   ██║${PINK}██║  ██║${PINK}██╔══╝  ${RESET}\n"
  printf "${BLUE} ██╔╝   ${BLUE}██║  ██║${PURPLE}██║ ╚═╝ ██║${PURPLE}██║  ██║${PINK}╚██████╗${PINK}╚██████╔╝${PINK}██████╔╝${PINK}███████╗${RESET}\n"
  printf "${DIM}${BLUE} ╚═╝    ╚═╝  ╚═╝${PURPLE}╚═╝     ╚═╝${PURPLE}╚═╝  ╚═╝${PINK} ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝${RESET}\n"
  printf "${DIM}${PURPLE}  installer${RESET}\n\n"
}

# ── Preflight checks ────────────────────────────────────────────────────
check_deps() {
  local missing=()

  if ! command -v node &>/dev/null; then
    missing+=("node (>= 18)")
  else
    local node_major
    node_major=$(node -e 'console.log(process.versions.node.split(".")[0])')
    if [ "$node_major" -lt 18 ]; then
      missing+=("node >= 18 (found v$(node -v))")
    fi
  fi

  if ! command -v git &>/dev/null; then
    missing+=("git")
  fi

  if ! command -v npm &>/dev/null; then
    missing+=("npm")
  fi

  if [ ${#missing[@]} -gt 0 ]; then
    fatal "Missing required dependencies: ${missing[*]}"
  fi
}

# ── Install ──────────────────────────────────────────────────────────────
do_install() {
  # Clone or update
  if [ -d "$INSTALL_DIR/.git" ]; then
    info "Updating existing installation..."
    git -C "$INSTALL_DIR" pull --ff-only --quiet
  else
    if [ -d "$INSTALL_DIR" ]; then
      rm -rf "$INSTALL_DIR"
    fi
    info "Cloning rmhcode..."
    git clone --depth 1 --quiet "$REPO" "$INSTALL_DIR"
  fi

  # Install deps and build patched CLI
  info "Installing dependencies and patching CLI..."
  cd "$INSTALL_DIR"
  npm install 2>&1 | tail -3
  ok "Patched CLI built"

  # Ensure bin dir exists
  mkdir -p "$BIN_DIR"

  # Create symlink
  local target="$INSTALL_DIR/bin/rmhcode.mjs"
  local link="$BIN_DIR/rmhcode"

  if [ -L "$link" ] || [ -e "$link" ]; then
    rm -f "$link"
  fi

  ln -s "$target" "$link"
  chmod +x "$target"

  ok "Installed rmhcode to $link"
}

# ── PATH check ───────────────────────────────────────────────────────────
check_path() {
  if [[ ":$PATH:" == *":$BIN_DIR:"* ]]; then
    return
  fi

  printf "\n"
  info "$BIN_DIR is not in your PATH. Add it with:"
  printf "\n"

  local shell_name
  shell_name=$(basename "${SHELL:-/bin/bash}")

  case "$shell_name" in
    zsh)
      printf "  ${DIM}echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.zshrc${RESET}\n"
      printf "  ${DIM}source ~/.zshrc${RESET}\n"
      ;;
    bash)
      printf "  ${DIM}echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.bashrc${RESET}\n"
      printf "  ${DIM}source ~/.bashrc${RESET}\n"
      ;;
    fish)
      printf "  ${DIM}fish_add_path ~/.local/bin${RESET}\n"
      ;;
    *)
      printf "  ${DIM}export PATH=\"\$HOME/.local/bin:\$PATH\"${RESET}\n"
      ;;
  esac
}

# ── Verify ───────────────────────────────────────────────────────────────
verify_install() {
  if [ -x "$BIN_DIR/rmhcode" ]; then
    printf "\n"
    ok "rmhcode is ready! Run it with:"
    printf "\n"
    printf "  ${BOLD}rmhcode${RESET}\n"
    printf "\n"
  else
    fatal "Installation failed — $BIN_DIR/rmhcode not found"
  fi
}

# ── Uninstall hint ───────────────────────────────────────────────────────
print_uninstall_hint() {
  printf "${DIM}To uninstall: rm -rf ~/.rmhcode ~/.local/bin/rmhcode${RESET}\n\n"
}

# ── Main ─────────────────────────────────────────────────────────────────
main() {
  print_banner
  check_deps
  do_install
  check_path
  verify_install
  print_uninstall_hint
}

main "$@"
