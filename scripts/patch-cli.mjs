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
    let count = 0;
    code = code.replaceAll(find, () => { count++; return replace; });
    if (count > 0) {
      console.log(`  ✓ ${label}: ${count} replacement(s)`);
      patchCount += count;
    } else {
      console.log(`  - ${label}: not found (skipped)`);
    }
  }

  // ── 1. Color replacements ─────────────────────────────────────────────

  // Replace Claude's signature orange accent
  replaceAll('#da7756', RMHCODE_ACCENT, 'Replace Claude orange accent');

  // Replace orange theme colors (spinner/shimmer) with rmhcode purple gradient
  replaceAll(
    'claude:"rgb(215,119,87)"',
    'claude:"rgb(132,122,206)"',
    'Theme claude color → purple'
  );
  replaceAll(
    'claudeShimmer:"rgb(245,149,117)"',
    'claudeShimmer:"rgb(162,152,236)"',
    'Theme claudeShimmer (light) → light purple'
  );
  replaceAll(
    'claudeShimmer:"rgb(235,159,127)"',
    'claudeShimmer:"rgb(162,152,236)"',
    'Theme claudeShimmer (dark) → light purple'
  );

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

  // ── 3. Rebrand remaining "Claude Code" in UI ────────────────────────────

  // Status bar bold header: {bold:!0},"Claude Code" → "rmhcode"
  replaceAll(
    '{bold:!0},"Claude Code"',
    '{bold:!0},"rmhcode"',
    'Status bar header rebrand'
  );

  // Product name variable: tL4="Claude Code" → "rmhcode"
  replaceAll(
    '="Claude Code"',
    '="rmhcode"',
    'Product name variable rebrand'
  );

  // Terminal title default: ??"Claude Code" → "rmhcode"
  replaceAll(
    '??"Claude Code"',
    '??"rmhcode"',
    'Terminal title rebrand'
  );

  // Onboarding text: "Claude Code" + "'ll be able to read..."
  replaceAll(
    '"Claude Code","\'","ll be able',
    '"rmhcode","\'","ll be able',
    'Onboarding text rebrand'
  );

  // Theme-styled header: ("Claude Code") in bA() calls
  replaceAll(
    '("Claude Code")',
    '("rmhcode")',
    'Theme-styled header rebrand'
  );

  // MCP server display name
  replaceAll(
    '"claude.ai":"Claude Code"',
    '"claude.ai":"rmhcode"',
    'MCP server name rebrand'
  );

  // ── 3b. Broad "Claude Code" → "rmhcode" catch-all ──────────────────────
  // This catches any remaining "Claude Code" instances not hit by specific patterns above.
  replaceAll('Claude Code', 'rmhcode', 'Broad Claude Code → rmhcode');

  // ── 3c. Standalone "Claude" in user-facing text ─────────────────────────
  // These replace behavioral/descriptive text where "Claude" refers to the assistant.
  // We preserve model names (Claude Opus, Claude Sonnet, Claude Haiku),
  // subscription tiers (Claude Max, Claude Team, Claude Enterprise),
  // and URLs/identifiers.
  replaceAll('"Claude will ', '"rmhcode will ', 'Claude will → rmhcode will');
  replaceAll('"Claude wants ', '"rmhcode wants ', 'Claude wants → rmhcode wants');
  replaceAll('"Claude is ', '"rmhcode is ', 'Claude is → rmhcode is');
  replaceAll('"Claude has ', '"rmhcode has ', 'Claude has → rmhcode has');
  replaceAll('"Claude found ', '"rmhcode found ', 'Claude found → rmhcode found');
  replaceAll('"Claude can ', '"rmhcode can ', 'Claude can → rmhcode can');
  replaceAll('"Claude may ', '"rmhcode may ', 'Claude may → rmhcode may');
  replaceAll('"Claude decides ', '"rmhcode decides ', 'Claude decides → rmhcode decides');
  replaceAll('"Claude understands', '"rmhcode understands', 'Claude understands → rmhcode');
  replaceAll('"Claude completes ', '"rmhcode completes ', 'Claude completes → rmhcode');
  replaceAll('"Claude explains ', '"rmhcode explains ', 'Claude explains → rmhcode');
  replaceAll('"Claude pauses ', '"rmhcode pauses ', 'Claude pauses → rmhcode');
  replaceAll('"Claude in Chrome', '"rmhcode in Chrome', 'Claude in Chrome → rmhcode');
  replaceAll('"Claude account', '"rmhcode account', 'Claude account → rmhcode');
  replaceAll('"Claude API', '"rmhcode API', 'Claude API → rmhcode');
  replaceAll('"Claude Desktop', '"rmhcode Desktop', 'Claude Desktop → rmhcode');
  replaceAll(' Claude Code ', ' rmhcode ', 'Inline Claude Code refs');
  replaceAll(' Claude Code.', ' rmhcode.', 'Inline Claude Code sentence-end');


  // Patch minified functions to return null when RMHCODE=1 is set.
  // Each entry: [name, params, firstLocal, label]
  const suppressTargets = [
    ['IR1', '', 'A', 'welcome screen'],
    ['cOq', 'A', 'q', 'home screen dashboard'],
    ['QOq', '', 'A', 'status bar'],
    ['y9z', '', 'A', 'small Claude logo'],
  ];

  for (const [name, params, local, label] of suppressTargets) {
    const pattern = new RegExp(`function ${name}\\(${params}\\)\\{let ${local}=w6\\(`);
    const match = code.match(pattern);
    if (match) {
      const injection = `function ${name}(${params}){if(process.env.RMHCODE==="1")return null;let ${local}=w6(`;
      code = code.slice(0, match.index) + injection + code.slice(match.index + match[0].length);
      console.log(`  ✓ Patched ${name} (${label}) to suppress when RMHCODE=1`);
      patchCount++;
    } else {
      console.log(`  - Function ${name} not found (skipped)`);
    }
  }

  // Fallback for IR1: if the function wasn't found, try patching the welcome message directly
  if (!code.match(/function IR1\(\)\{if\(process\.env/)) {
    const welcomeCheck = 'welcomeMessage:"Welcome to rmhcode"';
    if (code.includes(welcomeCheck)) {
      replaceAll(
        welcomeCheck,
        'welcomeMessage:process.env.RMHCODE==="1"?"":("Welcome to rmhcode")',
        'Suppress welcome via env check (IR1 fallback)'
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
