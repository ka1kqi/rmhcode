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
