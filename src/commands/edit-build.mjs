import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { requireAuth } from '../lib/config.mjs';
import { apiRequest, API_BASE } from '../lib/api.mjs';
import { success, error, info, color } from '../lib/output.mjs';
import { prompt, parseCommaSeparated } from '../lib/prompt.mjs';

/**
 * Run the interactive edit prompts for a build object and update via API.
 * Can be called directly with a build (from list-builds) or via CLI slug.
 * Mutates the build object with the API response so callers see updated state.
 */
export async function editBuildInteractive(build, config) {
  const rl = createInterface({ input: stdin, output: stdout });

  try {
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
    const technologies = parseCommaSeparated(techInput);

    const currentTags = (build.tags || []).join(', ');
    const tagInput = await prompt(rl, 'Tags (comma-separated)', currentTags);
    const tags = parseCommaSeparated(tagInput);

    const currentVis = (build.visibility || 'PUBLIC').toLowerCase();
    const visibilityInput = await prompt(rl, 'Visibility (public/unlisted/private)', currentVis);
    const visibility = visibilityInput.toUpperCase();

    rl.close();

    info('Updating build...');

    const data = await apiRequest(`/api/user-builds/${build.id}`, {
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

    // Sync the build object so callers (e.g. list-builds) see updated state
    build.title = data.title ?? title;
    build.description = data.description ?? description;
    build.slug = data.slug ?? build.slug;
    build.visibility = data.visibility ?? visibility;
    build.technologies = data.technologies ?? technologies;
    build.tags = data.tags ?? tags;
    build.repoUrl = data.repoUrl ?? repoUrl;
    build.demoUrl = data.demoUrl ?? demoUrl;
    build.thumbnailUrl = data.thumbnailUrl ?? thumbnailUrl;

    console.log('');
    success(`Build "${build.title}" updated!`);
    console.log(`  ${color.dim('View at:')} ${API_BASE}/user-builds/${build.slug}`);
    console.log('');
  } catch (e) {
    rl.close();
    throw e;
  }
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
    const listing = await apiRequest('/api/user-builds', {
      token: config.token,
      params: { userId: config.user.id, limit: '50' },
    });

    const build = listing.items.find(b => b.slug === slug);
    if (!build) {
      error(`Build "${slug}" not found.`);
      info('Use `rmhcode list-builds` to see your builds.');
      process.exit(1);
    }

    await editBuildInteractive(build, config);
  } catch (e) {
    error(e instanceof Error ? e.message : 'Failed to update build');
    process.exit(1);
  }
}
