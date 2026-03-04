import { deleteConfig } from '../lib/config.mjs';
import { success, info } from '../lib/output.mjs';

export function logout() {
  const deleted = deleteConfig();
  if (deleted) {
    success('Logged out successfully');
  } else {
    info('Already logged out');
  }
}
