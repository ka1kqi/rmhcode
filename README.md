<div align="center">

<img src="assets/gradient-bar.svg" width="100%" alt=""/>

<br/>

```
 ██╗    ██████╗ ███╗   ███╗██╗  ██╗ ██████╗ ██████╗ ██████╗ ███████╗
 ░██╗   ██╔══██╗████╗ ████║██║  ██║██╔════╝██╔═══██╗██╔══██╗██╔════╝
  ░██╗  ██████╔╝██╔████╔██║███████║██║     ██║   ██║██║  ██║█████╗
  ██╔╝  ██╔══██╗██║╚██╔╝██║██╔══██║██║     ██║   ██║██║  ██║██╔══╝
 ██╔╝   ██║  ██║██║ ╚═╝ ██║██║  ██║╚██████╗╚██████╔╝██████╔╝███████╗
 ╚═╝    ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝
```

A rebranded [Claude Code](https://github.com/anthropics/claude-code) CLI with a Gemini-style ASCII art banner and custom color theme.

<p>
  <a href="#install"><img src="https://img.shields.io/badge/install-one--liner-4796E4?style=flat-square" alt="Install"/></a>
  <img src="https://img.shields.io/badge/node-%3E%3D18-847ACE?style=flat-square&logo=node.js&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/license-MIT-C3677F?style=flat-square" alt="License"/>
</p>

<img src="assets/gradient-bar.svg" width="100%" alt=""/>

</div>

## Install

**One-liner (recommended):**

```bash
curl -fsSL https://raw.githubusercontent.com/ka1kqi/rmhcode/main/install.sh | bash
```

**Manual:**

```bash
git clone https://github.com/ka1kqi/rmhcode.git ~/.rmhcode
cd ~/.rmhcode && npm install
ln -s ~/.rmhcode/bin/rmhcode.mjs ~/.local/bin/rmhcode
```

### Prerequisites

- **Node.js** >= 18
- **npm**

## Usage

```bash
rmhcode              # launch with banner
rmhcode --init       # generate a CLAUDE.md for your project
rmhcode --version    # show version
rmhcode -p "prompt"  # print mode (no banner)
rmhcode --no-banner  # suppress banner
```

Set `RMHCODE_NO_BANNER=1` to always suppress the banner.

### `--init`: Auto-generate CLAUDE.md

Running `rmhcode --init` in any project directory scans your codebase and generates a `CLAUDE.md` file with:

- **Project name** (from `package.json`, `Cargo.toml`, `pyproject.toml`, or directory name)
- **Tech stack** detection (frameworks, databases, testing tools, styling, package managers)
- **Directory structure** with auto-detected purposes
- **Conventions** (linting, formatting, TypeScript config)
- **Common tasks** (extracted from `package.json` scripts)

## MCP Integrations

rmhcode comes with bundled MCP (Model Context Protocol) servers that are automatically configured during installation:

- **[DeepWiki](https://deepwiki.com)** — AI-powered documentation for any public GitHub repository. Browse wiki structures, read full docs, or ask questions grounded in a repo's source code.
- **GitHub MCP** — Interact with GitHub issues, pull requests, and repositories directly from the CLI.

MCP servers are saved to `~/.claude.json` on install. To use GitHub MCP's full capabilities, set `GITHUB_PERSONAL_ACCESS_TOKEN` in your environment.

## Uninstall

```bash
rm -rf ~/.rmhcode ~/.local/bin/rmhcode
```

## How it works

On `npm install`, a patch script:
1. Copies the Claude Code `cli.js`
2. Replaces Claude's orange accent (`#da7756`) with rmhcode's purple (`#847ACE`)
3. Rebrands all user-facing "Claude Code" text to "rmhcode"
4. Suppresses the built-in Claude Code header so only the rmhcode banner shows
5. Configures bundled MCP servers (DeepWiki, GitHub) in `~/.claude.json`

The wrapper CLI (`bin/rmhcode.mjs`) displays a gradient banner ( ${\color{#4796E4}blue}$ ${\color{#847ACE}purple}$ ${\color{#C3677F}pink}$ ) on startup, then passes all arguments through to the patched CLI.

## Color Palette

| Swatch | Hex | Role |
|--------|-----|------|
| ![#4796E4](https://img.shields.io/badge/-%234796E4-4796E4?style=flat-square) | `#4796E4` | Blue (gradient start) |
| ![#847ACE](https://img.shields.io/badge/-%23847ACE-847ACE?style=flat-square) | `#847ACE` | Purple (primary accent) |
| ![#C3677F](https://img.shields.io/badge/-%23C3677F-C3677F?style=flat-square) | `#C3677F` | Pink (gradient end) |

<div align="center">
<img src="assets/gradient-bar.svg" width="100%" alt=""/>
</div>

## License

MIT
