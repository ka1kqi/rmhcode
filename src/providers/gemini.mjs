import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// Ensure hideBanner is set in ~/.gemini/settings.json so the Gemini
// banner doesn't render underneath the rmhcode banner.
function ensureHideBanner() {
  const dir = join(process.env.HOME || '', '.gemini');
  const settingsPath = join(dir, 'settings.json');

  let settings = {};
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    } catch {}
  }

  if (settings.ui?.hideBanner === true) return; // already set

  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  settings.ui = { ...settings.ui, hideBanner: true };
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
}

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

  setup() {
    ensureHideBanner();
  },

  installInstructions: 'npm install -g @google/gemini-cli',
};
