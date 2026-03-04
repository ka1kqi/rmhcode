import { requireAuth } from '../lib/config.mjs';
import { apiRequest, API_BASE } from '../lib/api.mjs';
import { error, color, padEnd } from '../lib/output.mjs';
import { selectMenu } from '../lib/menu.mjs';
import { editBuildInteractive } from './edit-build.mjs';

function statusLabel(status) {
  switch (status) {
    case 'PUBLISHED': return color.green('●') + ' Published';
    case 'DRAFT': return color.yellow('●') + ' Draft';
    case 'ARCHIVED': return color.dim('●') + ' Archived';
    default: return status;
  }
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function buildLabel(build) {
  const title = padEnd(build.title.slice(0, 32), 34);
  const status = statusLabel(build.status);
  const vis = color.dim(build.visibility.toLowerCase());
  return `${title} ${status}  ${vis}`;
}

async function togglePublish(build, config) {
  const publish = build.status !== 'PUBLISHED';
  const newStatus = publish ? 'PUBLISHED' : 'DRAFT';

  const updated = await apiRequest(`/api/user-builds/${build.id}`, {
    method: 'PATCH',
    token: config.token,
    body: { status: newStatus },
  });

  Object.assign(build, updated);

  return publish
    ? color.green(`✓ "${build.title}" published!`)
    : color.yellow(`✓ "${build.title}" moved to draft.`);
}

async function showActions(build, config) {
  let flash = null;

  while (true) {
    const isPublished = build.status === 'PUBLISHED';

    const actions = [
      { label: 'Edit fields', value: 'edit' },
      { label: isPublished ? 'Unpublish (move to draft)' : 'Publish', value: 'toggle' },
      { label: 'View URL', value: 'url' },
      { label: color.dim('← Back to list'), value: 'back' },
    ];

    const action = await selectMenu(actions, {
      title: build.title,
      dim: `${statusLabel(build.status)}  ·  ${build.visibility.toLowerCase()}  ·  ${formatDate(build.publishedAt || build.createdAt)}`,
      flash,
    });

    flash = null;

    if (action === null || action === 'back') return;

    if (action === 'edit') {
      await editBuildInteractive(build, config);
      flash = color.green(`✓ Build updated!`);
    } else if (action === 'toggle') {
      flash = await togglePublish(build, config);
    } else if (action === 'url') {
      flash = color.cyan(`${API_BASE}/user-builds/${build.slug}`);
    }
  }
}

export async function listBuilds() {
  const config = requireAuth();

  try {
    const data = await apiRequest('/api/user-builds', {
      token: config.token,
      params: { userId: config.user.id, limit: '50' },
    });

    if (!data.items || data.items.length === 0) {
      console.log('');
      console.log(color.dim('  No builds found. Run `rmhcode push-build` to publish one.'));
      console.log('');
      return;
    }

    while (true) {
      const items = data.items.map(build => ({
        label: buildLabel(build),
        value: build,
      }));

      const selected = await selectMenu(items, {
        title: 'Your Builds',
        dim: '↑/↓ navigate · Enter select · q quit',
      });

      if (selected === null) break;

      await showActions(selected, config);
    }
  } catch (e) {
    error(e instanceof Error ? e.message : 'Failed to fetch builds');
    process.exit(1);
  }
}
