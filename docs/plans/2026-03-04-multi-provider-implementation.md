# Multi-Provider Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `--provider` flag to rmhcode so users can spawn Claude (default), OpenAI Codex, or Google Gemini CLI as the backend.

**Architecture:** Provider modules in `src/providers/` each export a standard interface (`findBinary`, `buildArgs`, `getEnv`, `installInstructions`). The main CLI parses `--provider <name>`, looks up the provider, and spawns its binary. The banner always shows "Powered by <Provider>".

**Tech Stack:** Node.js (ESM), child_process spawn, existing rmhcode CLI structure.

---

### Task 1: Create the Claude Provider Module

**Files:**
- Create: `src/providers/claude.mjs`

This extracts the existing `findCLI()` logic from `bin/rmhcode.mjs` (lines 429-451) into a provider module.

**Step 1: Create `src/providers/claude.mjs`**

```js
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

export default {
  name: 'claude',
  displayName: 'Claude',

  findBinary() {
    // 1. Prefer patched version (rebranded colors, no Claude header)
    const patched = join(ROOT, 'patched', 'cli.js');
    if (existsSync(patched)) return { path: patched, isScript: true };

    // 2. Fall back to system `claude`
    try {
      const which = execFileSync('which', ['claude'], { encoding: 'utf8' }).trim();
      if (which) return { path: which, isScript: false };
    } catch {}

    // 3. Check common install locations
    const locations = [
      join(process.env.HOME || '', '.local', 'bin', 'claude'),
      join(ROOT, 'node_modules', '.bin', 'claude'),
      join(ROOT, 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js'),
    ];

    for (const loc of locations) {
      if (existsSync(loc)) return { path: loc, isScript: loc.endsWith('.js') };
    }

    return null;
  },

  buildArgs(args) {
    return args;
  },

  getEnv() {
    const env = { RMHCODE: '1' };
    return env;
  },

  installInstructions: 'Run: node scripts/patch-cli.mjs\nOr install Claude Code: curl -fsSL https://claude.ai/install.sh | bash',
};
```

**Step 2: Verify file was created correctly**

Run: `node -e "import('./src/providers/claude.mjs').then(m => console.log(m.default.name))"`
Expected: `claude`

**Step 3: Commit**

```bash
git add src/providers/claude.mjs
git commit -m "feat: extract Claude provider module from inline findCLI"
```

---

### Task 2: Create the Codex Provider Module

**Files:**
- Create: `src/providers/codex.mjs`

**Step 1: Create `src/providers/codex.mjs`**

```js
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export default {
  name: 'codex',
  displayName: 'Codex',

  findBinary() {
    // 1. Check PATH via `which`
    try {
      const which = execFileSync('which', ['codex'], { encoding: 'utf8' }).trim();
      if (which) return { path: which, isScript: false };
    } catch {}

    // 2. Check common install locations
    const locations = [
      join(process.env.HOME || '', '.local', 'bin', 'codex'),
      '/usr/local/bin/codex',
    ];

    for (const loc of locations) {
      if (existsSync(loc)) return { path: loc, isScript: false };
    }

    return null;
  },

  buildArgs(args) {
    return args;
  },

  getEnv() {
    return {};
  },

  installInstructions: 'npm install -g @openai/codex',
};
```

**Step 2: Verify file was created correctly**

Run: `node -e "import('./src/providers/codex.mjs').then(m => console.log(m.default.name))"`
Expected: `codex`

**Step 3: Commit**

```bash
git add src/providers/codex.mjs
git commit -m "feat: add Codex provider module"
```

---

### Task 3: Create the Gemini Provider Module

**Files:**
- Create: `src/providers/gemini.mjs`

**Step 1: Create `src/providers/gemini.mjs`**

```js
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export default {
  name: 'gemini',
  displayName: 'Gemini',

  findBinary() {
    // 1. Check PATH via `which`
    try {
      const which = execFileSync('which', ['gemini'], { encoding: 'utf8' }).trim();
      if (which) return { path: which, isScript: false };
    } catch {}

    // 2. Check common install locations
    const locations = [
      join(process.env.HOME || '', '.local', 'bin', 'gemini'),
      '/usr/local/bin/gemini',
    ];

    for (const loc of locations) {
      if (existsSync(loc)) return { path: loc, isScript: false };
    }

    return null;
  },

  buildArgs(args) {
    return args;
  },

  getEnv() {
    return {};
  },

  installInstructions: 'npm install -g @google/gemini-cli',
};
```

**Step 2: Verify file was created correctly**

Run: `node -e "import('./src/providers/gemini.mjs').then(m => console.log(m.default.name))"`
Expected: `gemini`

**Step 3: Commit**

```bash
git add src/providers/gemini.mjs
git commit -m "feat: add Gemini provider module"
```

---

### Task 4: Create the Provider Registry

**Files:**
- Create: `src/providers/index.mjs`

**Step 1: Create `src/providers/index.mjs`**

```js
import claude from './claude.mjs';
import codex from './codex.mjs';
import gemini from './gemini.mjs';

export const providers = {
  claude,
  codex,
  gemini,
};

export const defaultProvider = 'claude';

export const providerNames = Object.keys(providers);
```

**Step 2: Verify registry loads all providers**

Run: `node -e "import('./src/providers/index.mjs').then(m => console.log(m.providerNames))"`
Expected: `[ 'claude', 'codex', 'gemini' ]`

**Step 3: Commit**

```bash
git add src/providers/index.mjs
git commit -m "feat: add provider registry"
```

---

### Task 5: Update Banner to Show "Powered by" Line

**Files:**
- Modify: `src/banner.mjs` — `renderBanner()` function (line 170) and `printBanner()` function (line 239)

The `renderBanner` function needs a new `providerDisplayName` parameter. After the tagline, add a "Powered by <Provider>" line.

**Step 1: Modify `renderBanner` signature and add powered-by line**

In `src/banner.mjs`, change the function signature on line 170 from:

```js
export function renderBanner(version = '1.0.0') {
```

to:

```js
export function renderBanner(version = '1.0.0', providerDisplayName = 'Claude') {
```

Then, after the tagline block (after line 213: `contentLines.push(...tagline...)`), add:

```js
  // Powered-by line
  const [pr, pg, pb] = getGradientColor(0.8);
  contentLines.push(`${DIM}${fg(pr, pg, pb)}  Powered by ${providerDisplayName}${RST}`);
```

**Step 2: Update `printBanner` to accept and forward providerDisplayName**

Change line 239 from:

```js
export function printBanner(version) {
  process.stdout.write(renderBanner(version));
}
```

to:

```js
export function printBanner(version, providerDisplayName) {
  process.stdout.write(renderBanner(version, providerDisplayName));
}
```

**Step 3: Verify banner renders with provider name**

Run: `node -e "import('./src/banner.mjs').then(m => m.printBanner('1.1.1', 'Gemini'))"`
Expected: Banner renders with "Powered by Gemini" visible below the tagline.

Run: `node -e "import('./src/banner.mjs').then(m => m.printBanner('1.1.1'))"`
Expected: Banner renders with "Powered by Claude" (default).

**Step 4: Commit**

```bash
git add src/banner.mjs
git commit -m "feat: add 'Powered by <Provider>' line to banner"
```

---

### Task 6: Update `bin/rmhcode.mjs` to Use Provider System

**Files:**
- Modify: `bin/rmhcode.mjs` — This is the main change. Parse `--provider`, use provider modules, replace inline `findCLI()`.

This task has multiple sub-steps since it modifies the main entry point.

**Step 1: Add provider import and `--provider` flag parsing**

At the top of `bin/rmhcode.mjs`, after line 9 (`import { existsSync, readFileSync, ... }`), add:

```js
import { providers, defaultProvider, providerNames } from '../src/providers/index.mjs';
```

Then, before the banner section (before line 14, the `// ── Banner ──` comment), add provider parsing:

```js
// ── Provider selection ──────────────────────────────────────────────────
const providerIdx = process.argv.indexOf('--provider');
let providerName = defaultProvider;
if (providerIdx !== -1 && process.argv[providerIdx + 1]) {
  providerName = process.argv[providerIdx + 1];
}

if (!providers[providerName]) {
  console.error(`\x1b[31mError: Unknown provider "${providerName}".\x1b[0m`);
  console.error(`Available providers: ${providerNames.join(', ')}`);
  process.exit(1);
}

const provider = providers[providerName];
```

**Step 2: Update banner call to pass provider display name**

Change line 41 from:

```js
  printBanner(version);
```

to:

```js
  printBanner(version, provider.displayName);
```

**Step 3: Strip `--provider <name>` from args passed to subprocess**

Replace line 466:

```js
const args = process.argv.slice(2).filter(a => a !== '--no-banner');
```

with:

```js
// Strip rmhcode-specific flags before passing to provider CLI
const rawArgs = process.argv.slice(2);
const args = [];
for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === '--provider') {
    i++; // skip the value too
    continue;
  }
  if (rawArgs[i] === '--no-banner') continue;
  args.push(rawArgs[i]);
}
```

**Step 4: Replace `findCLI()` and spawn logic with provider-based spawn**

Delete the entire `findCLI()` function (lines 429-451) and the old spawn block (lines 454-500). Replace with:

```js
// ── Resolve and spawn provider CLI ──────────────────────────────────────

const binary = provider.findBinary();

if (!binary) {
  console.error(`\x1b[31mError: Could not find ${provider.displayName} CLI.\x1b[0m`);
  console.error(`Install it: ${provider.installInstructions}`);
  console.error(`Or switch providers: rmhcode --provider claude`);
  process.exit(1);
}

// For .js scripts, run with node; for binaries, run directly
const cmd = binary.isScript ? process.execPath : binary.path;
const cmdArgs = binary.isScript ? [binary.path, ...args] : args;

// Build env: merge provider-specific env vars
const env = { ...process.env, ...provider.getEnv() };
// Remove CLAUDECODE to avoid nested session detection (Claude-specific but harmless for others)
delete env.CLAUDECODE;

const child = spawn(cmd, cmdArgs, {
  stdio: 'inherit',
  env,
});

child.on('error', (err) => {
  console.error(`\x1b[31mFailed to start ${provider.displayName}: ${err.message}\x1b[0m`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});

// Forward signals
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => {
    child.kill(sig);
  });
}
```

**Step 5: Verify the CLI still works with default (Claude) provider**

Run: `node bin/rmhcode.mjs --version`
Expected: Prints version (same behavior as before).

Run: `node bin/rmhcode.mjs --provider claude --version`
Expected: Same output — `--provider claude` is the default.

**Step 6: Verify unknown provider error**

Run: `node bin/rmhcode.mjs --provider fakeprovider --version`
Expected:
```
Error: Unknown provider "fakeprovider".
Available providers: claude, codex, gemini
```

**Step 7: Verify missing binary error (if codex/gemini not installed)**

Run: `node bin/rmhcode.mjs --provider codex`
Expected (if codex not installed):
```
Error: Could not find Codex CLI.
Install it: npm install -g @openai/codex
Or switch providers: rmhcode --provider claude
```

**Step 8: Commit**

```bash
git add bin/rmhcode.mjs
git commit -m "feat: use provider system for CLI backend selection"
```

---

### Task 7: Update README with Provider Documentation

**Files:**
- Modify: `README.md`

**Step 1: Add provider section to README**

Add a new section after the existing usage section:

```markdown
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
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add multi-provider usage documentation"
```

---

### Task 8: Smoke Test All Providers

**Step 1: Test Claude provider end-to-end**

Run: `node bin/rmhcode.mjs --provider claude --version`
Expected: Version output, no errors.

**Step 2: Test Codex provider (if installed)**

Run: `which codex && node bin/rmhcode.mjs --provider codex --version || echo "codex not installed, skip"`

**Step 3: Test Gemini provider (if installed)**

Run: `which gemini && node bin/rmhcode.mjs --provider gemini -p "say hello" || echo "gemini not installed, skip"`

**Step 4: Test banner with each provider**

Run: `node -e "import('./src/banner.mjs').then(m => { m.printBanner('1.1.1', 'Claude'); m.printBanner('1.1.1', 'Codex'); m.printBanner('1.1.1', 'Gemini'); })"`
Expected: Three banners, each with different "Powered by" text.

**Step 5: Test error cases**

Run: `node bin/rmhcode.mjs --provider unknown 2>&1`
Expected: Error with available providers list.

Run: `node bin/rmhcode.mjs --provider codex 2>&1` (assuming codex not installed)
Expected: Error with install instructions.

**Step 6: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address issues found during smoke testing"
```
