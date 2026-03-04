import claude from './claude.mjs';
import codex from './codex.mjs';
import gemini from './gemini.mjs';

export const providers = {
  claude,
  codex,
  gemini,
};

export const defaultProvider = 'claude';

export const providerNames = Object.keys(providers);
