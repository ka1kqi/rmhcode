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
