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

A rebranded [Claude Code](https://github.com/anthropics/claude-code) CLI with a custom color theme, ASCII art banner, and built-in [rmhstudios.com](https://rmhstudios.com) integrations.

<p>
  <a href="#install"><img src="https://img.shields.io/badge/install-one--liner-4796E4?style=flat-square" alt="Install"/></a>
  <img src="https://img.shields.io/badge/node-%3E%3D18-847ACE?style=flat-square&logo=node.js&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/license-MIT-C3677F?style=flat-square" alt="License"/>
</p>

<img src="assets/gradient-bar.svg" width="100%" alt=""/>

</div>

## Install

### Prerequisites

- **Node.js** >= 18
- **npm**

### macOS / Linux

**One-liner (recommended):**

```bash
curl -fsSL https://raw.githubusercontent.com/ka1kqi/rmhcode/main/install.sh | bash
```
*Note, sometimes may require an uninstall before reinstalling for updates

**Manual:**

```bash
git clone https://github.com/ka1kqi/rmhcode.git ~/.rmhcode
cd ~/.rmhcode && npm install
ln -s ~/.rmhcode/bin/rmhcode.mjs ~/.local/bin/rmhcode
```

### Windows

**Option 1: Installer (.exe)** — Download the latest `rmhcode-*-setup-x64.exe` from [Releases](https://github.com/ka1kqi/rmhcode/releases).

**Option 2: PowerShell one-liner:**

```powershell
irm https://raw.githubusercontent.com/ka1kqi/rmhcode/main/install.ps1 | iex
```

**Option 3: Manual:**

```powershell
git clone https://github.com/ka1kqi/rmhcode.git $env:USERPROFILE\.rmhcode
cd $env:USERPROFILE\.rmhcode; npm install
```

Then add `%USERPROFILE%\.rmhcode\bin` to your PATH and create a `rmhcode.cmd` wrapper:

```cmd
@echo off
node "%USERPROFILE%\.rmhcode\bin\rmhcode.mjs" %*
```

## Usage

```bash
rmhcode              # launch with banner
rmhcode --init       # generate a CLAUDE.md for your project
rmhcode --tmux       # launch a 3-pane tmux workspace
rmhcode --version    # show version
rmhcode -p "prompt"  # print mode (no banner)
rmhcode --no-banner  # suppress banner
```

Set `RMHCODE_NO_BANNER=1` to always suppress the banner.

All standard Claude Code arguments and flags work as normal — rmhcode is a full Claude Code wrapper.

## Providers

rmhcode supports multiple AI coding backends. By default, it uses Claude.

### Available Providers

| Provider | Flag | Requires |
|----------|------|----------|
| Claude (default) | `--provider claude` | Included with rmhcode |
| OpenAI Codex | `--provider codex` | `npm install -g @openai/codex` |
| Google Gemini | `--provider gemini` | `npm install -g @google/gemini-cli` |

### Usage

```bash
# Use Claude (default)
rmhcode

# Use Codex
rmhcode --provider codex

# Use Gemini
rmhcode --provider gemini
```

Each provider uses its own CLI flags. Pass flags after `--provider <name>`:

```bash
rmhcode --provider gemini -p "explain this code"
```

> **Note:** When using the Gemini provider, rmhcode automatically sets `ui.hideBanner` in `~/.gemini/settings.json` so only the rmhcode banner is shown.

## RMH Builds Integration

Publish and manage projects on the [rmhstudios.com User Builds](https://rmhstudios.com/user-builds) showcase directly from the terminal.

### Authentication

Generate a token at [rmhstudios.com/rmhcode](https://rmhstudios.com/rmhcode), then:

```bash
rmhcode login --token YOUR_TOKEN
```

Or use the browser-based flow:

```bash
rmhcode login
```

This opens your browser to authorize rmhcode with your RMH account.

### Commands

| Command | Description |
|---------|-------------|
| `rmhcode login` | Authenticate with your RMH account (browser flow or `--token`) |
| `rmhcode whoami` | Show current authenticated user |
| `rmhcode push-build` | Publish a project to User Builds (interactive prompts) |
| `rmhcode push-build --create-repo` | Create a GitHub repo, push code, and publish in one step |
| `rmhcode edit-build <slug>` | Edit an existing build by its slug |
| `rmhcode list-builds` | Browse and manage your published builds (interactive menu) |
| `rmhcode logout` | Sign out and remove stored token |

### Example: Publishing a build

```bash
$ rmhcode push-build

  Publish a new build to RMH User Builds
  Fields marked with * are required

? Title *: My Cool Project
? Description *: A web app built with Next.js and Prisma
? Repository URL: https://github.com/user/repo
? Demo URL: https://my-project.vercel.app
? Thumbnail Image URL:
? Technologies (comma-separated): Next.js, TypeScript, Prisma
? Tags (comma-separated): web, fullstack
? Visibility (public/unlisted/private) (public):
? Publish now? (y/n) (y):
? Include README.md from current directory? (y/n) (y):

→ Publishing build...
✓ Build "My Cool Project" published!
  View at: https://rmhstudios.com/user-builds/my-cool-project
```

### Auto-create GitHub repo

Use `--create-repo` to create a GitHub repository, push your code, and publish — all in one step:

```bash
$ rmhcode push-build --create-repo
```

This will:
1. Create a public GitHub repo named after your current directory
2. Initialize git (if needed), stage, commit, and push your code
3. Auto-fill the Repository URL and continue with the publish prompts

Requires `GITHUB_PERSONAL_ACCESS_TOKEN` in your environment with the `repo` scope. Create one at [github.com/settings/tokens](https://github.com/settings/tokens).

### Browsing your builds

```bash
$ rmhcode list-builds

  Your Builds
  ↑/↓ navigate · Enter select · q quit

 ❯ My Cool Project                 ● Published  public
   Portfolio Site                   ● Draft      unlisted
   API Backend                     ● Published  public
```

Select a build to open its action menu — edit fields, publish/unpublish, or view the URL — all without leaving the terminal.

### Editing a build

```bash
$ rmhcode edit-build my-cool-project
```

Opens interactive prompts to update any field. Press Enter to keep the current value for a field.

Token is stored at `~/.rmhcode/config.json` with owner-only permissions. Tokens expire after 30 days and can be revoked at [rmhstudios.com/rmhcode](https://rmhstudios.com/rmhcode).

### `--tmux`: Tmux Workspace

Launch a ready-made 3-pane tmux session:

```
+──────────────+──────────────+
|              |   rmhcode    |
|   rmhcode    |   (top-R)    |
|   (left)     +--------------+
|              |   shell      |
|              |   (bot-R)    |
+──────────────+──────────────+
```

```bash
rmhcode --tmux                    # launch workspace
rmhcode --tmux --provider gemini  # all panes use Gemini
```

- Auto-installs tmux via Homebrew (macOS) or your Linux package manager if missing
- Reattaches to an existing `rmhcode` session if one is already running
- Detects nested tmux and exits cleanly

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

**macOS / Linux:**

```bash
rm -rf ~/.rmhcode ~/.local/bin/rmhcode
```

**Windows (installer):** Use Add/Remove Programs or run the uninstaller from the Start Menu.

**Windows (PowerShell install):**

```powershell
Remove-Item -Recurse ~\.rmhcode, ~\.local\bin\rmhcode.*
```

## How it works

On `npm install`, a patch script:
1. Copies the Claude Code `cli.js`
2. Replaces Claude's orange accent (`#da7756`) with rmhcode's purple (`#847ACE`)
3. Rebrands all user-facing "Claude Code" text to "rmhcode"
4. Suppresses the built-in Claude Code header so only the rmhcode banner shows
5. Configures bundled MCP servers (DeepWiki, GitHub) in `~/.claude.json`

The wrapper CLI (`bin/rmhcode.mjs`) intercepts RMH-specific commands (`login`, `whoami`, `push-build`, `list-builds`, `logout`), displays a gradient banner ( ${\color{#4796E4}blue}$ ${\color{#847ACE}purple}$ ${\color{#C3677F}pink}$ ) with a "Powered by" indicator on startup, then uses the `--provider` flag to select which backend CLI to spawn (Claude by default, or Codex/Gemini). Provider modules in `src/providers/` handle binary detection, argument translation, and provider-specific setup.

## Color Palette

| Swatch | Hex | Role |
|--------|-----|------|
| ![#4796E4](https://img.shields.io/badge/-%234796E4-4796E4?style=flat-square) | `#4796E4` | Blue (gradient start) |
| ![#847ACE](https://img.shields.io/badge/-%23847ACE-847ACE?style=flat-square) | `#847ACE` | Purple (primary accent) |
| ![#C3677F](https://img.shields.io/badge/-%23C3677F-C3677F?style=flat-square) | `#C3677F` | Pink (gradient end) |

<div align="center">
<img src="assets/gradient-bar.svg" width="100%" alt=""/>
</div>

## Standalone Binaries

Pre-built standalone binaries (no Node.js required) are available on the [Releases](https://github.com/ka1kqi/rmhcode/releases) page for:

| Platform | Architecture | Binary |
|----------|-------------|--------|
| Linux | x64 | `rmhcode-linux-x64` |
| Linux | ARM64 | `rmhcode-linux-arm64` |
| macOS | x64 (Intel) | `rmhcode-macos-x64` |
| macOS | ARM64 (Apple Silicon) | `rmhcode-macos-arm64` |
| Windows | x64 | `rmhcode-win-x64.exe` |

Download the binary for your platform, make it executable (`chmod +x` on Linux/macOS), and place it in your PATH.

To build binaries locally with [Bun](https://bun.sh):

```bash
bun build ./bin/rmhcode.mjs --compile --target=bun-linux-x64 --outfile dist/rmhcode-linux-x64
```

## Building the Windows Installer

To build the installer locally on a Windows machine:

1. Install [Inno Setup 6](https://jrsoftware.org/isdl.php) (or `winget install JRSoftware.InnoSetup`)
2. Run the build script:

```powershell
.\installer\build-installer.ps1
```

The installer `.exe` will be output to the `dist/` directory.

### CI/CD

The GitHub Actions workflow at `.github/workflows/build-windows-installer.yml` automatically builds the installer when a version tag is pushed:

```bash
git tag v1.2.1
git push origin v1.2.1
```

This produces both an installer `.exe` and a portable `.zip`, attached to the GitHub Release.

### Code Signing

<!-- TODO: Configure code signing to avoid SmartScreen warnings -->
The installer is not currently code-signed. To add signing:

- Obtain an EV or OV code signing certificate
- In the Inno Setup config (`installer/rmhcode.iss`), add a `[Setup]` `SignTool` directive
- In CI, set the certificate as a GitHub secret and configure `signtool.exe`

## License

MIT
