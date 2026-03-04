import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { writeConfig } from '../lib/config.mjs';
import { apiRequest, API_BASE } from '../lib/api.mjs';
import { success, error, info } from '../lib/output.mjs';

function openBrowser(url) {
  const { platform } = process;
  const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';

  execFile(cmd, [url], (err) => {
    if (err) {
      info(`Open this URL in your browser:\n  ${url}`);
    }
  });
}

async function loginWithToken(token) {
  try {
    info('Validating token...');
    const data = await apiRequest('/api/rmhcode/auth/validate', {
      method: 'POST',
      body: { token },
    });

    writeConfig({ token, user: data.user });
    success(`Logged in as ${data.user.username || data.user.name}`);
  } catch (e) {
    error(e instanceof Error ? e.message : 'Login failed');
    process.exit(1);
  }
}

async function loginWithBrowser() {
  const sessionId = randomBytes(16).toString('hex');

  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url || '/', 'http://localhost');
      const token = url.searchParams.get('token');
      const errorParam = url.searchParams.get('error');
      const userParam = url.searchParams.get('user');

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body style="background:#0a0a0a;color:#e4e4e7;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
            <div style="text-align:center">
              <h2>${token ? '&#10003; Authorized!' : '&#10007; Authorization failed'}</h2>
              <p>You can close this tab and return to the terminal.</p>
            </div>
          </body>
        </html>
      `);

      if (errorParam) {
        error('Authorization denied by user');
        server.close();
        process.exit(1);
      }

      if (token && userParam) {
        try {
          const user = JSON.parse(userParam);
          writeConfig({ token, user });
          success(`Logged in as ${user.username || user.name}`);
        } catch {
          error('Failed to parse user info from callback');
        }
        server.close();
        resolve();
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        error('Failed to start local server');
        process.exit(1);
      }

      const callbackUrl = `http://127.0.0.1:${addr.port}`;
      const authUrl = `${API_BASE}/rmhcode/auth?callback=${encodeURIComponent(callbackUrl)}&session=${sessionId}`;

      info('Opening browser for authentication...');
      openBrowser(authUrl);
      info('Waiting for authorization...');
    });

    setTimeout(() => {
      error('Login timed out after 5 minutes');
      server.close();
      reject(new Error('timeout'));
    }, 5 * 60 * 1000);
  });
}

export async function login(args) {
  const tokenIdx = args.indexOf('--token');
  if (tokenIdx !== -1) {
    const token = args[tokenIdx + 1];
    if (!token) {
      error('Missing token value. Usage: rmhcode login --token YOUR_TOKEN');
      process.exit(1);
    }
    await loginWithToken(token);
  } else {
    await loginWithBrowser();
  }
}
