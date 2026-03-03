#!/usr/bin/env node

// Patches the Claude Code cli.js to:
// 1. Replace Claude's orange (#da7756) accent with rmhcode's blue-purple
// 2. Suppress Claude's built-in header/welcome banner
// 3. Rebrand "Claude Code" → "rmhcode" in user-visible UI text
// 4. Replace orange chalk colors with rmhcode theme colors

import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PATCHED_DIR = join(ROOT, 'patched');
const SOURCE_CLI = join(ROOT, 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');

// ── rmhcode color theme ─────────────────────────────────────────────────
const RMHCODE_ACCENT = '#847ACE';  // purple (midpoint of gradient)

function patchFile(source, dest) {
  console.log(`Reading ${source}...`);
  let code = readFileSync(source, 'utf8');
  const originalSize = code.length;
  let patchCount = 0;

  function replaceAll(find, replace, label) {
    const count = code.split(find).length - 1;
    if (count > 0) {
      code = code.replaceAll(find, replace);
      console.log(`  ✓ ${label}: ${count} replacement(s)`);
      patchCount += count;
    } else {
      console.log(`  - ${label}: not found (skipped)`);
    }
  }

  // ── 1. Color replacements ─────────────────────────────────────────────

  // Replace Claude's signature orange accent
  replaceAll('#da7756', RMHCODE_ACCENT, 'Replace Claude orange accent');

  // ── 2. Rebrand user-visible UI text ───────────────────────────────────

  replaceAll('(Claude Code)', '(rmhcode)', 'Version display rebrand');
  replaceAll(
    '/help: Get help with using Claude Code',
    '/help: Get help with using rmhcode',
    'Help text rebrand'
  );

  // Welcome messages: "Welcome to Claude Code" → "Welcome to rmhcode"
  replaceAll(
    'Welcome to Claude Code',
    'Welcome to rmhcode',
    'Welcome message rebrand'
  );

  // The diagnostics title: "Claude Code v..." → "rmhcode v..."
  replaceAll(
    'Claude Code v$',
    'rmhcode v$',
    'Diagnostics title rebrand'
  );

  // Changelog/tips: "Claude Code" in user-facing tips
  replaceAll(
    'Share Claude Code',
    'Share rmhcode',
    'Share text rebrand'
  );
  replaceAll(
    'Claude Code changelog',
    'rmhcode changelog',
    'Changelog rebrand'
  );

  // The color attribute: color:"claude" → our theme color
  // This is used in ink components for the Claude orange branding
  // The theme system maps "claude" to the orange color
  replaceAll(
    'color:"claude"',
    'color:"magenta"',
    'Theme color attribute'
  );

  // ── 3. Suppress header when RMHCODE=1 ─────────────────────────────────

  // The header rendering function IR1() renders the welcome screen.
  // We patch it to return null when RMHCODE env is set.
  // Pattern: "function IR1(){" (the header component)
  const headerFnPattern = /function IR1\(\)\{let A=w6\(/;
  const headerMatch = code.match(headerFnPattern);
  if (headerMatch) {
    const idx = code.indexOf(headerMatch[0]);
    const injection = `function IR1(){if(process.env.RMHCODE==="1")return null;let A=w6(`;
    code = code.slice(0, idx) + injection + code.slice(idx + headerMatch[0].length);
    console.log('  ✓ Patched header function to suppress when RMHCODE=1');
    patchCount++;
  } else {
    // Fallback: try to find any header function by the Welcome pattern
    // The welcome text is in a function that starts with "function " and contains
    // "Welcome to rmhcode" (already replaced above)
    console.log('  - Header function IR1 not found (trying alternative pattern)');

    // Alternative: suppress at the component level
    // The welcome element is created like: createElement(T,null,"Welcome to rmhcode")
    // We can replace the welcome text with empty string when env is set
    const welcomeCheck = 'welcomeMessage:"Welcome to rmhcode"';
    if (code.includes(welcomeCheck)) {
      replaceAll(
        welcomeCheck,
        'welcomeMessage:process.env.RMHCODE==="1"?"":("Welcome to rmhcode")',
        'Suppress welcome via env check'
      );
    }
  }

  console.log(`\n  Total patches applied: ${patchCount}`);
  console.log(`  Size: ${originalSize} → ${code.length} bytes`);

  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, code);
  console.log(`\nWritten to ${dest}`);
}

// ── Main ────────────────────────────────────────────────────────────────

function main() {
  if (!existsSync(SOURCE_CLI)) {
    console.log('Installing @anthropic-ai/claude-code...');
    execFileSync('npm', ['install', '--save-dev', '@anthropic-ai/claude-code@latest'], {
      cwd: ROOT,
      stdio: 'inherit',
    });
  }

  if (!existsSync(SOURCE_CLI)) {
    console.error('Error: Could not find claude-code cli.js');
    process.exit(1);
  }

  const dest = join(PATCHED_DIR, 'cli.js');
  patchFile(SOURCE_CLI, dest);

  // Copy supporting files
  const sourceDir = dirname(SOURCE_CLI);
  for (const file of ['resvg.wasm', 'tree-sitter-bash.wasm', 'tree-sitter.wasm']) {
    const src = join(sourceDir, file);
    const dst = join(PATCHED_DIR, file);
    if (existsSync(src)) {
      cpSync(src, dst);
      console.log(`Copied ${file}`);
    }
  }

  // Copy vendor directory (ripgrep)
  const vendorSrc = join(sourceDir, 'vendor');
  const vendorDst = join(PATCHED_DIR, 'vendor');
  if (existsSync(vendorSrc)) {
    cpSync(vendorSrc, vendorDst, { recursive: true });
    console.log('Copied vendor/');
  }

  console.log('\nDone! Patched CLI is at:', dest);
}

main();
