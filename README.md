# rmhcode

A rebranded [Claude Code](https://github.com/anthropics/claude-code) CLI with a Gemini CLI-style ASCII art banner and custom color theme.

```
 ██╗    ██████╗ ███╗   ███╗██╗  ██╗ ██████╗ ██████╗ ██████╗ ███████╗
 ░██╗   ██╔══██╗████╗ ████║██║  ██║██╔════╝██╔═══██╗██╔══██╗██╔════╝
  ░██╗  ██████╔╝██╔████╔██║███████║██║     ██║   ██║██║  ██║█████╗
  ██╔╝  ██╔══██╗██║╚██╔╝██║██╔══██║██║     ██║   ██║██║  ██║██╔══╝
 ██╔╝   ██║  ██║██║ ╚═╝ ██║██║  ██║╚██████╗╚██████╔╝██████╔╝███████╗
 ╚═╝    ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝
```

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
rmhcode --version    # show version
rmhcode -p "prompt"  # print mode (no banner)
rmhcode --no-banner  # suppress banner
```

Set `RMHCODE_NO_BANNER=1` to always suppress the banner.

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

The wrapper CLI (`bin/rmhcode.mjs`) displays a Gemini CLI-style gradient banner (blue → purple → pink) on startup, then passes all arguments through to the patched CLI.

## License

MIT
