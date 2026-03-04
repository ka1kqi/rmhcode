import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { requireAuth } from '../lib/config.mjs';
import { apiRequest, API_BASE } from '../lib/api.mjs';
import { success, error, info, color } from '../lib/output.mjs';

async function prompt(rl, question, currentValue) {
  const suffix = currentValue ? ` ${color.dim(`(${currentValue})`)}` : '';
  const answer = await rl.question(`${color.cyan('?')} ${question}${suffix}: `);
  return answer.trim() || currentValue || '';
}

export async function editBuild(args) {
  const slug = args[0];
  if (!slug) {
    error('Usage: rmhcode edit-build <build-name>');
    info('Use `rmhcode list-builds` to see your builds.');
    process.exit(1);
  }

  const config = requireAuth();

  try {
    // Fetch existing build by slug
    const build = await apiRequest(`/api/user-builds/${slug}`, {
      token: config.token,
    });

    const rl = createInterface({ input: stdin, output: stdout });

    console.log('');
    console.log(color.bold(`  Edit build: ${build.title}`));
    console.log(color.dim('  Press Enter to keep current value'));
    console.log('');

    const title = await prompt(rl, 'Title', build.title);
    const description = await prompt(rl, 'Description', build.description);
    const repoUrl = await prompt(rl, 'Repository URL', build.repoUrl);
    const demoUrl = await prompt(rl, 'Demo URL', build.demoUrl);
    const thumbnailUrl = await prompt(rl, 'Thumbnail Image URL', build.thumbnailUrl);

    const currentTech = (build.technologies || []).join(', ');
    const techInput = await prompt(rl, 'Technologies (comma-separated)', currentTech);
    const technologies = techInput ? techInput.split(',').map(t => t.trim()).filter(Boolean) : [];

    const currentTags = (build.tags || []).join(', ');
    const tagInput = await prompt(rl, 'Tags (comma-separated)', currentTags);
    const tags = tagInput ? tagInput.split(',').map(t => t.trim()).filter(Boolean) : [];

    const currentVis = (build.visibility || 'PUBLIC').toLowerCase();
    const visibilityInput = await prompt(rl, 'Visibility (public/unlisted/private)', currentVis);
    const visibility = visibilityInput.toUpperCase();

    rl.close();

    info('Updating build...');

    const data = await apiRequest(`/api/user-builds/${slug}`, {
      method: 'PATCH',
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
      },
    });

    console.log('');
    success(`Build "${data.title}" updated!`);
    console.log(`  ${color.dim('View at:')} ${API_BASE}/user-builds/${data.slug}`);
    console.log('');
  } catch (e) {
    error(e instanceof Error ? e.message : 'Failed to update build');
    process.exit(1);
  }
}
