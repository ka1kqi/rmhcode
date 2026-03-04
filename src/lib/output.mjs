const ESC = '\x1b';

export const color = {
  green: (s) => `${ESC}[32m${s}${ESC}[0m`,
  red: (s) => `${ESC}[31m${s}${ESC}[0m`,
  yellow: (s) => `${ESC}[33m${s}${ESC}[0m`,
  cyan: (s) => `${ESC}[36m${s}${ESC}[0m`,
  dim: (s) => `${ESC}[2m${s}${ESC}[0m`,
  bold: (s) => `${ESC}[1m${s}${ESC}[0m`,
  violet: (s) => `${ESC}[35m${s}${ESC}[0m`,
};

export function success(msg) {
  console.log(color.green(`✓ ${msg}`));
}

export function error(msg) {
  console.error(color.red(`✗ ${msg}`));
}

export function info(msg) {
  console.log(color.cyan(`→ ${msg}`));
}

export function padEnd(str, len) {
  return str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length);
}
