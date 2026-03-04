import { color } from './output.mjs';

/**
 * Interactive arrow-key menu using raw stdin.
 *
 * @param {Array<{ label: string, value: any }>} items
 * @param {{ title?: string, dim?: string, flash?: string }} options
 * @returns {Promise<any|null>} selected value, or null on quit
 */
export function selectMenu(items, options = {}) {
  return new Promise((resolve) => {
    if (items.length === 0) {
      resolve(null);
      return;
    }

    let cursor = 0;
    let escTimeout = null;
    let resolved = false;
    const { title, dim: dimText, flash } = options;

    function render() {
      process.stdout.write('\x1b[u'); // restore to saved position
      process.stdout.write('\x1b[J'); // clear everything below
      draw();
    }

    function draw() {
      process.stdout.write('\x1b[s'); // save cursor position

      if (title) {
        process.stdout.write(`\n  ${color.bold(title)}\n`);
      }
      if (dimText) {
        process.stdout.write(`  ${color.dim(dimText)}\n`);
      }
      if (flash) {
        process.stdout.write(`  ${flash}\n`);
      }

      process.stdout.write('\n');

      for (let i = 0; i < items.length; i++) {
        const prefix = i === cursor ? color.cyan(' ❯ ') : '   ';
        const text = i === cursor ? color.cyan(items[i].label) : items[i].label;
        process.stdout.write(`${prefix}${text}\n`);
      }
    }

    function cleanup() {
      if (resolved) return;
      resolved = true;
      if (escTimeout) {
        clearTimeout(escTimeout);
        escTimeout = null;
      }
      process.stdin.setRawMode(false);
      process.stdin.removeListener('data', onKey);
      process.removeListener('SIGINT', onSigint);
      process.stdin.pause();
      // Restore cursor to where menu started and clear it,
      // so the next menu or output starts from the same position
      process.stdout.write('\x1b[u');
      process.stdout.write('\x1b[J');
    }

    function onSigint() {
      cleanup();
      resolve(null);
    }

    function onKey(data) {
      const key = data.toString();

      if (escTimeout) {
        clearTimeout(escTimeout);
        escTimeout = null;
      }

      // Bare escape — defer to distinguish from arrow key sequences
      if (key === '\x1b') {
        escTimeout = setTimeout(() => {
          cleanup();
          resolve(null);
        }, 50);
        return;
      }

      // Ctrl+C in raw mode arrives as \x03
      if (key === '\x03' || key === 'q') {
        cleanup();
        resolve(null);
        return;
      }

      // Enter
      if (key === '\r' || key === '\n') {
        cleanup();
        resolve(items[cursor].value);
        return;
      }

      // Arrow up (full sequence or trailing portion after split escape)
      if (key === '\x1b[A' || key === '[A' || key === 'k') {
        cursor = cursor > 0 ? cursor - 1 : items.length - 1;
        render();
        return;
      }

      // Arrow down
      if (key === '\x1b[B' || key === '[B' || key === 'j') {
        cursor = cursor < items.length - 1 ? cursor + 1 : 0;
        render();
        return;
      }
    }

    // Initial draw
    draw();

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', onKey);
    process.on('SIGINT', onSigint);
  });
}
