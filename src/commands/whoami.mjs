import { requireAuth } from '../lib/config.mjs';
import { apiRequest } from '../lib/api.mjs';
import { error, color } from '../lib/output.mjs';

export async function whoami() {
  const config = requireAuth();

  try {
    const data = await apiRequest('/api/rmhcode/auth/validate', {
      method: 'POST',
      body: { token: config.token },
    });

    const u = data.user;
    console.log('');
    console.log(color.bold('  Logged in as:'));
    console.log(`  Name:     ${u.name}`);
    if (u.username) console.log(`  Username: ${color.violet(`@${u.username}`)}`);
    if (u.email) console.log(`  Email:    ${color.dim(u.email)}`);
    console.log('');
  } catch {
    error('Token is invalid or expired. Run `rmhcode login` to re-authenticate.');
    process.exit(1);
  }
}
