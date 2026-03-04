import { color } from './output.mjs';

export async function prompt(rl, question, defaultValue) {
  const suffix = defaultValue ? ` ${color.dim(`(${defaultValue})`)}` : '';
  const answer = await rl.question(`${color.cyan('?')} ${question}${suffix}: `);
  return answer.trim() || defaultValue || '';
}

export function parseCommaSeparated(input) {
  return input ? input.split(',').map(s => s.trim()).filter(Boolean) : [];
}
