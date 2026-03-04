# Multi-Provider Support Design

## Goal

Allow rmhcode to spawn different AI coding CLI backends (Claude, Codex, Gemini) via a `--provider` flag, while keeping the unified rmhcode banner and RMH commands.

## Decisions

- **Providers**: Claude (default), OpenAI Codex, Google Gemini CLI
- **Selection**: `--provider <name>` CLI flag. Default is `claude`.
- **Dependencies**: Users install provider CLIs separately. rmhcode checks for the binary and shows install instructions if missing.
- **Branding**: Same rmhcode gradient banner for all providers. Always show "Powered by <Provider>" line.
- **Architecture**: Provider modules in `src/providers/` with a standard interface.

## Provider Interface

Each provider module (`src/providers/<name>.mjs`) exports:

```js
export default {
  name: 'gemini',             // Internal key
  displayName: 'Gemini',      // Shown in banner/errors

  findBinary(),               // Returns { path, isScript } or null
  buildArgs(args),            // Transform user args for this provider
  getEnv(),                   // Env vars to set when spawning

  installInstructions: '...', // Shown when binary not found
}
```

## Files

| File | Change |
|---|---|
| `src/providers/claude.mjs` | New. Extracts existing `findCLI()` logic, sets `RMHCODE=1` env. |
| `src/providers/codex.mjs` | New. Finds `codex` binary, passes args through. |
| `src/providers/gemini.mjs` | New. Finds `gemini` binary, passes args through. |
| `src/providers/index.mjs` | New. Exports `{ claude, codex, gemini }` registry. |
| `bin/rmhcode.mjs` | Modified. Parse `--provider`, strip it from args, use provider modules for spawn. Remove inline `findCLI()`. |
| `src/banner.mjs` | Modified. Add "Powered by X" indicator line after banner. |

## CLI Flag Handling

1. Parse `--provider <name>` from `process.argv` early
2. Strip `--provider <name>` and `--no-banner` from args before passing to subprocess
3. All other args pass through to the provider CLI as-is
4. Unknown provider name shows error with available providers list

## Banner

Same gradient banner for all providers. Below the banner:

```
  Powered by Claude
```

or

```
  Powered by Gemini
```

Uses existing color palette.

## Error Messages

**Binary not found:**
```
Error: Could not find Codex CLI.
Install it: npm install -g @openai/codex
Or switch providers: rmhcode --provider claude
```

**Unknown provider:**
```
Error: Unknown provider "foo".
Available providers: claude, codex, gemini
```

## Out of Scope (v2)

- Config file for default provider
- Normalized `--prompt` flag across providers
- Provider-specific arg translation
- Auto-install of provider CLIs
- Patching/branding of non-Claude provider output
