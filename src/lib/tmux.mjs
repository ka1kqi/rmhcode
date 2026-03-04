// src/lib/tmux.mjs — tmux session launcher for rmhcode

import { execFileSync, spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { platform } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

/**
 * Launch a 3-pane tmux session:
 *   left: rmhcode | top-right: rmhcode | bottom-right: shell
 */
export function launchTmuxSession(providerArgs = []) {
  // 1. Nested tmux check
  if (process.env.TMUX) {
    console.error('\x1b[33mAlready inside a tmux session. Nesting is not supported.\x1b[0m');
    process.exit(1);
  }

  // 2. Ensure tmux is installed
  if (!isTmuxInstalled()) {
    const installed = installTmux();
    if (!installed) process.exit(1);
  }

  // 3. Reattach to existing session if one exists
  const hasSession = spawnSync('tmux', ['has-session', '-t', 'rmhcode'], { stdio: 'ignore' });
  if (hasSession.status === 0) {
    console.log('\x1b[36mReattaching to existing rmhcode tmux session...\x1b[0m');
    spawnSync('tmux', ['attach-session', '-t', 'rmhcode'], { stdio: 'inherit' });
    process.exit(0);
  }

  // 4. Resolve the rmhcode command
  const rmhCmd = resolveRmhCommand(providerArgs);
  const rmhCmdStr = rmhCmd.map(a => a.includes(' ') ? `"${a}"` : a).join(' ');

  // 5. Create the 3-pane layout with empty shells first, then send commands.
  //    This ensures the layout is finalized before rmhcode renders its banner.
  //    Pane 0: left  (rmhcode)
  //    Pane 1: right (rmhcode) — split horizontally from pane 0
  //    Pane 2: bottom-right (shell) — split vertically from pane 1
  spawnSync('tmux', ['new-session', '-d', '-s', 'rmhcode'], { stdio: 'ignore' });
  spawnSync('tmux', ['split-window', '-h', '-t', 'rmhcode:0'], { stdio: 'ignore' });
  spawnSync('tmux', ['split-window', '-v', '-t', 'rmhcode:0.1'], { stdio: 'ignore' });
  spawnSync('tmux', ['select-layout', '-t', 'rmhcode:0', 'main-vertical'], { stdio: 'ignore' });
  spawnSync('tmux', ['select-pane', '-t', 'rmhcode:0.0'], { stdio: 'ignore' });

  // Now that panes are sized correctly, launch rmhcode in panes 0 and 1
  spawnSync('tmux', ['send-keys', '-t', 'rmhcode:0.0', rmhCmdStr, 'Enter'], { stdio: 'ignore' });
  spawnSync('tmux', ['send-keys', '-t', 'rmhcode:0.1', rmhCmdStr, 'Enter'], { stdio: 'ignore' });

  // 6. Attach
  spawnSync('tmux', ['attach-session', '-t', 'rmhcode'], { stdio: 'inherit' });

  // 7. Exit
  process.exit(0);
}

function whichSync(cmd) {
  try {
    return execFileSync('which', [cmd], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

function isTmuxInstalled() {
  return whichSync('tmux') !== null;
}

function installTmux() {
  const os = platform();

  if (os === 'darwin') {
    console.log('\x1b[36mInstalling tmux via Homebrew...\x1b[0m');
    if (!whichSync('brew')) {
      console.error('\x1b[31mHomebrew not found. Install it from https://brew.sh then retry.\x1b[0m');
      return false;
    }
    const result = spawnSync('brew', ['install', 'tmux'], { stdio: 'inherit' });
    return result.status === 0;
  }

  if (os === 'linux') {
    const managers = [
      { check: 'apt-get', cmd: ['sudo', 'apt-get', 'install', '-y', 'tmux'] },
      { check: 'dnf',     cmd: ['sudo', 'dnf', 'install', '-y', 'tmux'] },
      { check: 'yum',     cmd: ['sudo', 'yum', 'install', '-y', 'tmux'] },
      { check: 'pacman',  cmd: ['sudo', 'pacman', '-S', '--noconfirm', 'tmux'] },
      { check: 'apk',     cmd: ['sudo', 'apk', 'add', 'tmux'] },
    ];

    for (const mgr of managers) {
      if (whichSync(mgr.check)) {
        console.log(`\x1b[36mInstalling tmux via ${mgr.check}...\x1b[0m`);
        const result = spawnSync(mgr.cmd[0], mgr.cmd.slice(1), { stdio: 'inherit' });
        return result.status === 0;
      }
    }

    console.error('\x1b[31mNo supported package manager found. Install tmux manually.\x1b[0m');
    return false;
  }

  if (os === 'win32') {
    console.error('\x1b[33mtmux is not natively available on Windows.\x1b[0m');
    console.error('Options:');
    console.error('  1. Use WSL: wsl --install, then run rmhcode --tmux inside WSL');
    console.error('  2. Use Windows Terminal with multiple tabs instead');
    return false;
  }

  console.error(`\x1b[31mUnsupported platform: ${os}. Install tmux manually.\x1b[0m`);
  return false;
}

function resolveRmhCommand(providerArgs) {
  // Try to find rmhcode in PATH
  const binPath = whichSync('rmhcode');
  if (binPath) return [binPath, ...providerArgs];

  // Fall back to running via node
  const scriptPath = resolve(ROOT, 'bin/rmhcode.mjs');
  return ['node', scriptPath, ...providerArgs];
}
