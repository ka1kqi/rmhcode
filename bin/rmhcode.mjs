#!/usr/bin/env node

// rmhcode — Claude Code with a Gemini CLI-style banner
// Uses a patched cli.js with rebranded colors and suppressed Claude header.

import { execFileSync, spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { providers, defaultProvider, providerNames } from '../src/providers/index.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

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
const rmhCommands = new Set(['login', 'whoami', 'push-build', 'list-builds', 'logout']);
const suppressBanner = process.argv.includes('--no-banner') ||
  process.argv.includes('-p') ||
  process.argv.includes('--print') ||
  process.argv.includes('--help') ||
  process.argv.includes('-h') ||
  process.argv.includes('--version') ||
  process.argv.includes('-v') ||
  process.argv.includes('--init') ||
  rmhCommands.has(process.argv[2]) ||
  process.env.RMHCODE_NO_BANNER === '1';

if (isInteractive && !suppressBanner) {
  printBanner(version, provider.displayName);
}

// ── RMH Commands ────────────────────────────────────────────────────────

import { login } from '../src/commands/login.mjs';
import { whoami } from '../src/commands/whoami.mjs';
import { pushBuild } from '../src/commands/push-build.mjs';
import { listBuilds } from '../src/commands/list-builds.mjs';
import { logout } from '../src/commands/logout.mjs';

const RMH_COMMANDS = {
  login,
  whoami,
  'push-build': pushBuild,
  'list-builds': listBuilds,
  logout,
};

const firstArg = process.argv[2];
if (firstArg && firstArg in RMH_COMMANDS) {
  try {
    await RMH_COMMANDS[firstArg](process.argv.slice(3));
  } catch (e) {
    console.error(`\x1b[31m${e instanceof Error ? e.message : 'Unknown error'}\x1b[0m`);
    process.exit(1);
  }
  process.exit(0);
}

// ── --init: Generate CLAUDE.md ──────────────────────────────────────────

if (process.argv.includes('--init')) {
  generateClaudeMd();
  process.exit(0);
}

function generateClaudeMd() {
  const cwd = process.cwd();
  const target = join(cwd, 'CLAUDE.md');

  // Colors
  const blue = '\x1b[38;2;71;150;228m';
  const purple = '\x1b[38;2;132;122;206m';
  const dim = '\x1b[2m';
  const bold = '\x1b[1m';
  const reset = '\x1b[0m';
  const green = '\x1b[32m';
  const red = '\x1b[31m';

  if (existsSync(target)) {
    console.log(`${red}CLAUDE.md already exists in this directory.${reset}`);
    console.log(`${dim}Delete it first if you want to regenerate.${reset}`);
    process.exit(1);
  }

  console.log(`${purple}${bold}rmhcode --init${reset}`);
  console.log(`${dim}Scanning project...${reset}\n`);

  // ── Detect project signals ────────────────────────────────────────────
  const projectName = detectProjectName(cwd);
  const techStack = detectTechStack(cwd);
  const dirMap = scanDirectories(cwd);

  // ── Build CLAUDE.md ───────────────────────────────────────────────────
  const sections = [];

  sections.push(`# ${projectName}\n`);

  // Project description
  const description = detectDescription(cwd);
  if (description) {
    sections.push(`${description}\n`);
  }

  // Tech stack
  if (techStack.length > 0) {
    sections.push(`## Tech Stack\n`);
    sections.push(techStack.map(t => `- ${t}`).join('\n') + '\n');
  }

  // Directory structure
  if (dirMap.length > 0) {
    sections.push(`## Project Structure\n`);
    sections.push(dirMap.map(d => `- \`${d.name}/\` — ${d.purpose}`).join('\n') + '\n');
  }

  // Conventions (placeholder)
  sections.push(`## Conventions\n`);

  const conventions = detectConventions(cwd);
  if (conventions.length > 0) {
    sections.push(conventions.map(c => `- ${c}`).join('\n') + '\n');
  } else {
    sections.push(`<!-- Add your project conventions here -->\n`);
  }

  // Architecture notes (placeholder)
  sections.push(`## Architecture Notes\n`);
  sections.push(`<!-- Add key architectural decisions, patterns, and important context here -->\n`);

  // Common tasks (placeholder)
  sections.push(`## Common Tasks\n`);

  const tasks = detectTasks(cwd);
  if (tasks.length > 0) {
    sections.push(tasks.map(t => `- **${t.name}**: \`${t.command}\``).join('\n') + '\n');
  } else {
    sections.push(`<!-- Add common commands like build, test, deploy here -->\n`);
  }

  const content = sections.join('\n');
  writeFileSync(target, content);

  // ── Summary ───────────────────────────────────────────────────────────
  console.log(`${green}✓${reset} Generated ${bold}CLAUDE.md${reset} for ${blue}${projectName}${reset}\n`);

  if (techStack.length > 0) {
    console.log(`${dim}  Stack:${reset} ${techStack.join(', ')}`);
  }
  if (dirMap.length > 0) {
    console.log(`${dim}  Dirs:${reset}  ${dirMap.length} top-level directories mapped`);
  }

  console.log(`\n${dim}Edit CLAUDE.md to add conventions and architecture notes.${reset}`);
}

// ── Detection helpers ─────────────────────────────────────────────────────

function detectProjectName(cwd) {
  // Try package.json
  const pkgPath = join(cwd, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      if (pkg.name) return pkg.name;
    } catch {}
  }

  // Try Cargo.toml
  const cargoPath = join(cwd, 'Cargo.toml');
  if (existsSync(cargoPath)) {
    try {
      const cargo = readFileSync(cargoPath, 'utf8');
      const match = cargo.match(/^name\s*=\s*"([^"]+)"/m);
      if (match) return match[1];
    } catch {}
  }

  // Try pyproject.toml
  const pyprojectPath = join(cwd, 'pyproject.toml');
  if (existsSync(pyprojectPath)) {
    try {
      const pyproject = readFileSync(pyprojectPath, 'utf8');
      const match = pyproject.match(/^name\s*=\s*"([^"]+)"/m);
      if (match) return match[1];
    } catch {}
  }

  // Fall back to directory name
  return cwd.split('/').pop() || 'Project';
}

function detectDescription(cwd) {
  const pkgPath = join(cwd, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      if (pkg.description) return pkg.description;
    } catch {}
  }
  return null;
}

function detectTechStack(cwd) {
  const stack = [];

  // ── Node/JS ecosystem ──────────────────────────────────────────────
  const pkgPath = join(cwd, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (existsSync(join(cwd, 'tsconfig.json'))) stack.push('TypeScript');
      else stack.push('JavaScript');

      // Frameworks
      if (allDeps['next']) stack.push('Next.js');
      else if (allDeps['nuxt']) stack.push('Nuxt');
      else if (allDeps['@sveltejs/kit']) stack.push('SvelteKit');
      else if (allDeps['react']) stack.push('React');
      else if (allDeps['vue']) stack.push('Vue');
      else if (allDeps['svelte']) stack.push('Svelte');

      // Backend
      if (allDeps['express']) stack.push('Express');
      else if (allDeps['fastify']) stack.push('Fastify');
      else if (allDeps['hono']) stack.push('Hono');
      else if (allDeps['koa']) stack.push('Koa');

      // Databases
      if (allDeps['prisma'] || allDeps['@prisma/client']) stack.push('Prisma');
      else if (allDeps['drizzle-orm']) stack.push('Drizzle');
      else if (allDeps['mongoose']) stack.push('MongoDB/Mongoose');
      else if (allDeps['pg']) stack.push('PostgreSQL');

      // Services
      if (allDeps['@supabase/supabase-js']) stack.push('Supabase');
      else if (allDeps['firebase'] || allDeps['firebase-admin']) stack.push('Firebase');

      // Testing
      if (allDeps['vitest']) stack.push('Vitest');
      else if (allDeps['jest']) stack.push('Jest');

      // Styling
      if (allDeps['tailwindcss']) stack.push('Tailwind CSS');

      // Package manager
      if (existsSync(join(cwd, 'bun.lockb'))) stack.push('Bun');
      else if (existsSync(join(cwd, 'pnpm-lock.yaml'))) stack.push('pnpm');
      else if (existsSync(join(cwd, 'yarn.lock'))) stack.push('Yarn');
    } catch {}
  }

  // ── Rust ────────────────────────────────────────────────────────────
  if (existsSync(join(cwd, 'Cargo.toml'))) stack.push('Rust');

  // ── Go ──────────────────────────────────────────────────────────────
  if (existsSync(join(cwd, 'go.mod'))) stack.push('Go');

  // ── Python ──────────────────────────────────────────────────────────
  if (existsSync(join(cwd, 'pyproject.toml')) || existsSync(join(cwd, 'requirements.txt'))) {
    stack.push('Python');
    if (existsSync(join(cwd, 'pyproject.toml'))) {
      try {
        const pyproject = readFileSync(join(cwd, 'pyproject.toml'), 'utf8');
        if (pyproject.includes('fastapi')) stack.push('FastAPI');
        else if (pyproject.includes('django')) stack.push('Django');
        else if (pyproject.includes('flask')) stack.push('Flask');
      } catch {}
    }
  }

  // ── Docker ──────────────────────────────────────────────────────────
  if (existsSync(join(cwd, 'Dockerfile')) || existsSync(join(cwd, 'docker-compose.yml'))) {
    stack.push('Docker');
  }

  return stack;
}

function scanDirectories(cwd) {
  const ignore = new Set([
    'node_modules', '.git', '.next', '.nuxt', '.svelte-kit', '.vercel',
    'dist', 'build', 'out', 'target', '__pycache__', '.venv', 'venv',
    'coverage', '.cache', '.turbo', '.claude', '.vscode', '.idea',
  ]);

  const dirs = [];
  try {
    const entries = readdirSync(cwd, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.') && !['src', 'lib', 'app'].includes(entry.name)) {
        if (ignore.has(entry.name)) continue;
        // skip other dotdirs
        continue;
      }
      if (ignore.has(entry.name)) continue;

      dirs.push({
        name: entry.name,
        purpose: guessDirectoryPurpose(cwd, entry.name),
      });
    }
  } catch {}

  return dirs.slice(0, 20); // cap at 20 to keep it readable
}

function guessDirectoryPurpose(cwd, name) {
  const knownDirs = {
    src: 'Source code',
    lib: 'Library code',
    app: 'Application code / routes',
    apps: 'Applications (monorepo)',
    packages: 'Packages (monorepo)',
    components: 'UI components',
    pages: 'Page components / routes',
    api: 'API routes / backend',
    server: 'Server-side code',
    client: 'Client-side code',
    public: 'Static assets',
    assets: 'Static assets',
    static: 'Static files',
    styles: 'Stylesheets',
    utils: 'Utility functions',
    helpers: 'Helper functions',
    hooks: 'React hooks / Git hooks',
    types: 'TypeScript type definitions',
    config: 'Configuration files',
    scripts: 'Build/utility scripts',
    tests: 'Tests',
    test: 'Tests',
    __tests__: 'Tests',
    spec: 'Test specs',
    docs: 'Documentation',
    migrations: 'Database migrations',
    prisma: 'Prisma schema / migrations',
    supabase: 'Supabase configuration',
    docker: 'Docker configuration',
    deploy: 'Deployment configuration',
    infra: 'Infrastructure as code',
    tools: 'Developer tools',
    bin: 'CLI entry points / executables',
    cmd: 'CLI commands',
    internal: 'Internal packages',
    pkg: 'Packages',
    vendor: 'Vendored dependencies',
    fixtures: 'Test fixtures',
    mocks: 'Test mocks',
    e2e: 'End-to-end tests',
    cypress: 'Cypress E2E tests',
    playwright: 'Playwright E2E tests',
    storybook: 'Storybook stories',
    stories: 'Component stories',
  };

  if (knownDirs[name]) return knownDirs[name];

  // Check if it has its own package.json (sub-project)
  if (existsSync(join(cwd, name, 'package.json'))) {
    try {
      const pkg = JSON.parse(readFileSync(join(cwd, name, 'package.json'), 'utf8'));
      if (pkg.description) return pkg.description;
      return 'Sub-project';
    } catch {}
  }

  return '<!-- describe this directory -->';
}

function detectConventions(cwd) {
  const conventions = [];

  if (existsSync(join(cwd, '.eslintrc.json')) || existsSync(join(cwd, '.eslintrc.js')) || existsSync(join(cwd, 'eslint.config.js'))) {
    conventions.push('ESLint for linting');
  }
  if (existsSync(join(cwd, '.prettierrc')) || existsSync(join(cwd, '.prettierrc.json')) || existsSync(join(cwd, 'prettier.config.js'))) {
    conventions.push('Prettier for formatting');
  }
  if (existsSync(join(cwd, 'tsconfig.json'))) {
    conventions.push('TypeScript strict mode (check tsconfig.json for details)');
  }

  return conventions;
}

function detectTasks(cwd) {
  const tasks = [];

  const pkgPath = join(cwd, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      const scripts = pkg.scripts || {};
      const interesting = ['dev', 'build', 'test', 'lint', 'start', 'deploy', 'typecheck', 'check'];
      const pm = existsSync(join(cwd, 'bun.lockb')) ? 'bun' :
                 existsSync(join(cwd, 'pnpm-lock.yaml')) ? 'pnpm' : 'npm';

      for (const name of interesting) {
        if (scripts[name]) {
          tasks.push({ name, command: `${pm} run ${name}` });
        }
      }
    } catch {}
  }

  // Makefile
  if (existsSync(join(cwd, 'Makefile'))) {
    tasks.push({ name: 'make', command: 'make' });
  }

  return tasks;
}

// ── Resolve and spawn provider CLI ──────────────────────────────────────

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

const binary = provider.findBinary();

if (!binary) {
  console.error(`\x1b[31mError: Could not find ${provider.displayName} CLI.\x1b[0m`);
  console.error(`Install it: ${provider.installInstructions}`);
  console.error(`Or switch providers: rmhcode --provider claude`);
  process.exit(1);
}

// For .js scripts, run with node; for binaries, run directly
const cmd = binary.isScript ? process.execPath : binary.path;
const finalArgs = provider.buildArgs(args);
const cmdArgs = binary.isScript ? [binary.path, ...finalArgs] : finalArgs;

// Build env: merge provider-specific env vars
const env = { ...process.env, ...provider.getEnv() };
// Remove CLAUDECODE to avoid nested session detection
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
