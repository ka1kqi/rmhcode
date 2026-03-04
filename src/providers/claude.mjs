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
