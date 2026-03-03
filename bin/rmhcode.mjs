#!/usr/bin/env node

// rmhcode — Claude Code with a Gemini CLI-style banner
// Uses a patched cli.js with rebranded colors and suppressed Claude header.

import { execFileSync, spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Banner ──────────────────────────────────────────────────────────────

import { printBanner } from '../src/banner.mjs';

// Read version from package.json
let version = '1.0.0';
try {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  version = pkg.version;
} catch {}

// Only show banner for interactive sessions (not piped, not --help, etc.)
const isInteractive = process.stdin.isTTY && process.stdout.isTTY;
const suppressBanner = process.argv.includes('--no-banner') ||
  process.argv.includes('-p') ||
  process.argv.includes('--print') ||
  process.argv.includes('--help') ||
  process.argv.includes('-h') ||
  process.argv.includes('--version') ||
  process.argv.includes('-v') ||
  process.env.RMHCODE_NO_BANNER === '1';

if (isInteractive && !suppressBanner) {
  printBanner(version);
}

// ── Resolve CLI to run ──────────────────────────────────────────────────

function findCLI() {
  // 1. Prefer patched version (has rebranded colors, no Claude header)
  const patched = join(ROOT, 'patched', 'cli.js');
  if (existsSync(patched)) return { path: patched, isPatched: true };

  // 2. Fall back to system `claude`
  try {
    const which = execFileSync('which', ['claude'], { encoding: 'utf8' }).trim();
    if (which) return { path: which, isPatched: false };
  } catch {}

  // 3. Check common install locations
  const locations = [
    join(process.env.HOME || '', '.local', 'bin', 'claude'),
    join(ROOT, 'node_modules', '.bin', 'claude'),
    join(ROOT, 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js'),
  ];

  for (const loc of locations) {
    if (existsSync(loc)) return { path: loc, isPatched: false };
  }

  return null;
}

const cli = findCLI();

if (!cli) {
  console.error('\x1b[31mError: Could not find Claude Code CLI.\x1b[0m');
  console.error('Run the patch script first: node scripts/patch-cli.mjs');
  console.error('Or install Claude Code: curl -fsSL https://claude.ai/install.sh | bash');
  process.exit(1);
}

// ── Pass through to CLI ─────────────────────────────────────────────────

// Forward all args (strip --no-banner if present)
const args = process.argv.slice(2).filter(a => a !== '--no-banner');

// For patched cli.js, run with node; for binaries, run directly
const cmd = cli.isPatched ? process.execPath : cli.path;
const cmdArgs = cli.isPatched ? [cli.path, ...args] : args;

// Build env: RMHCODE=1 tells patched CLI to suppress its header
// Remove CLAUDECODE to avoid nested session detection
const env = { ...process.env, RMHCODE: '1' };
delete env.CLAUDECODE;

const child = spawn(cmd, cmdArgs, {
  stdio: 'inherit',
  env,
});

child.on('error', (err) => {
  console.error(`\x1b[31mFailed to start: ${err.message}\x1b[0m`);
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
