import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { readFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { execFileSync } from 'node:child_process';
import { requireAuth } from '../lib/config.mjs';
import { apiRequest, API_BASE } from '../lib/api.mjs';
import { success, error, info, color } from '../lib/output.mjs';

async function prompt(rl, question, defaultValue) {
  const suffix = defaultValue ? ` ${color.dim(`(${defaultValue})`)}` : '';
  const answer = await rl.question(`${color.cyan('?')} ${question}${suffix}: `);
  return answer.trim() || defaultValue || '';
}

async function createGitHubRepo() {
  const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      'GITHUB_PERSONAL_ACCESS_TOKEN environment variable is required for --create-repo.\n' +
      'Create one at https://github.com/settings/tokens with the "repo" scope.'
    );
  }

  const repoName = basename(process.cwd());
  info(`Creating GitHub repository "${repoName}"...`);

  const res = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
    },
    body: JSON.stringify({ name: repoName, private: false }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const details = body.errors?.map(e => e.message).filter(Boolean).join(', ');
    const msg = details || body.message || `HTTP ${res.status}`;
    throw new Error(`Failed to create GitHub repo: ${msg}`);
  }

  const repo = await res.json();

  // Initialize git repo if not already one
  try {
    execFileSync('git', ['rev-parse', '--git-dir'], { stdio: 'pipe' });
  } catch {
    execFileSync('git', ['init'], { stdio: 'inherit' });
  }

  const remoteUrl = repo.clone_url;
  // Authenticated URL for push, then reset to clean URL
  const authUrl = remoteUrl.replace('https://', `https://${token}@`);

  // Add or update the origin remote (use auth URL for push)
  try {
    execFileSync('git', ['remote', 'get-url', 'origin'], { stdio: 'pipe' });
    execFileSync('git', ['remote', 'set-url', 'origin', authUrl], { stdio: 'pipe' });
  } catch {
    execFileSync('git', ['remote', 'add', 'origin', authUrl], { stdio: 'pipe' });
  }

  // Stage, commit, and push
  info('Staging files...');
  execFileSync('git', ['add', '.'], { stdio: 'inherit', timeout: 30000 });
  try {
    execFileSync('git', ['commit', '-m', 'Initial commit'], { stdio: 'inherit', timeout: 30000 });
  } catch {
    // commit fails if there's nothing new to commit — that's fine
  }
  const branch = execFileSync('git', ['branch', '--show-current'], { stdio: 'pipe' })
    .toString()
    .trim();
  info('Pushing to GitHub...');
  execFileSync('git', ['push', '-u', 'origin', branch], {
    stdio: 'inherit',
    timeout: 60000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });

  // Reset remote to clean URL (no token)
  execFileSync('git', ['remote', 'set-url', 'origin', remoteUrl], { stdio: 'pipe' });

  return repo.html_url;
}

export async function pushBuild() {
  const args = process.argv.slice(3);
  const createRepo = args.includes('--create-repo');
  const config = requireAuth();

  let autoRepoUrl;
  if (createRepo) {
    try {
      autoRepoUrl = await createGitHubRepo();
      success(`GitHub repo created: ${autoRepoUrl}`);
    } catch (e) {
      error(e instanceof Error ? e.message : 'Failed to create GitHub repo');
      process.exit(1);
    }
  }

  const rl = createInterface({ input: stdin, output: stdout });

  try {
    console.log('');
    console.log(color.bold('  Publish a new build to RMH User Builds'));
    console.log(color.dim('  Fields marked with * are required'));
    console.log('');

    let title = '';
    while (title.length < 5 || title.length > 100) {
      title = await prompt(rl, 'Title *');
      if (title.length < 5) info('Title must be at least 5 characters');
      if (title.length > 100) info('Title must be at most 100 characters');
    }

    let description = '';
    while (description.length < 10 || description.length > 500) {
      description = await prompt(rl, 'Description *');
      if (description.length < 10) info('Description must be at least 10 characters');
      if (description.length > 500) info('Description must be at most 500 characters');
    }

    let repoUrl;
    if (autoRepoUrl) {
      repoUrl = autoRepoUrl;
      info(`Repository URL: ${repoUrl}`);
    } else {
      repoUrl = await prompt(rl, 'Repository URL');
    }
    const demoUrl = await prompt(rl, 'Demo URL');
    const thumbnailUrl = await prompt(rl, 'Thumbnail Image URL');

    const techInput = await prompt(rl, 'Technologies (comma-separated)');
    const technologies = techInput ? techInput.split(',').map(t => t.trim()).filter(Boolean) : [];

    const tagInput = await prompt(rl, 'Tags (comma-separated)');
    const tags = tagInput ? tagInput.split(',').map(t => t.trim()).filter(Boolean) : [];

    const visibilityInput = await prompt(rl, 'Visibility (public/unlisted/private)', 'public');
    const visibility = visibilityInput.toUpperCase();

    const publishInput = await prompt(rl, 'Publish now? (y/n)', 'y');
    const publish = publishInput.toLowerCase() !== 'n';

    let readme;
    const readmePath = join(process.cwd(), 'README.md');
    if (existsSync(readmePath)) {
      const includeReadme = await prompt(rl, 'Include README.md from current directory? (y/n)', 'y');
      if (includeReadme.toLowerCase() !== 'n') {
        readme = readFileSync(readmePath, 'utf-8');
      }
    }

    rl.close();

    info('Publishing build...');

    const data = await apiRequest('/api/user-builds', {
      method: 'POST',
      token: config.token,
      body: {
        title,
        description,
        repoUrl: repoUrl || undefined,
        demoUrl: demoUrl || undefined,
        thumbnailUrl: thumbnailUrl || undefined,
        technologies,
        tags,
        visibility,
        publish,
        readme,
      },
    });

    console.log('');
    success(`Build "${data.title}" ${publish ? 'published' : 'saved as draft'}!`);
    console.log(`  ${color.dim('View at:')} ${API_BASE}/user-builds/${data.slug}`);
    console.log('');
  } catch (e) {
    rl.close();
    error(e instanceof Error ? e.message : 'Failed to publish build');
    process.exit(1);
  }
}
