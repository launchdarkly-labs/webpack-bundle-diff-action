import * as core from '@actions/core';
import * as github from '@actions/github';
import { access, constants } from 'fs';
import * as path from 'path';

import { AssetDiff, getDiff } from './diff';
import {
  getAddedTable,
  getBiggerTable,
  getRemovedTable,
  getSmallerTable,
} from './format';

async function assertFileExists(path: string) {
  return new Promise<void>((resolve, reject) =>
    access(path, constants.F_OK, (error) =>
      error ? reject(new Error(`${path} does not exist`)) : resolve(),
    ),
  );
}

function renderSection({
  title,
  assets,
  formatter,
}: {
  title: string;
  assets: AssetDiff[];
  formatter(assets: AssetDiff[]): string;
}) {
  return `
<details ${assets.length > 0 ? 'open="true"' : ''}>
  <summary>${title}</summary>
  ${assets.length > 0 ? formatter(assets) : 'No relevant assets.'}
</details>
`;
}

async function run() {
  try {
    const inputs = {
      base: core.getInput('base-stats-path'),
      head: core.getInput('head-stats-path'),
      githubToken: core.getInput('github-token'),
    };

    const paths = {
      base: path.resolve(process.cwd(), inputs.base),
      head: path.resolve(process.cwd(), inputs.head),
    };

    assertFileExists(paths.base);
    assertFileExists(paths.head);

    const stats = {
      base: require(paths.base),
      head: require(paths.head),
    };

    const diff = getDiff(stats);

    const tables = {
      added: getAddedTable(diff.added),
      removed: getAddedTable(diff.removed),
      smaller: getAddedTable(diff.smaller),
      bigger: getAddedTable(diff.bigger),
      unchanged: getAddedTable(diff.unchanged),
    };

    const octokit = github.getOctokit(inputs.githubToken);

    const owner = github.context.repo.owner;
    const repo = github.context.repo.repo;
    const sha = github.context.sha;
    const pullRequestId = github.context.issue.number;
    if (!pullRequestId) {
      throw new Error('Could not find the PR id');
    }

    const body = [
      `### Webpack bundle diff at ${sha}`,
      renderSection({
        title: '🔼 Bundle size increased',
        assets: diff.bigger,
        formatter: getBiggerTable,
      }),

      renderSection({
        title: '🔽 Bundle size decreased',
        assets: diff.smaller,
        formatter: getSmallerTable,
      }),

      renderSection({
        title: '🆕 New bundles',
        assets: diff.added,
        formatter: getAddedTable,
      }),

      renderSection({
        title: '🚮 Removed bundles',
        assets: diff.removed,
        formatter: getRemovedTable,
      }),
    ].join('\n');

    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: pullRequestId,
      body,
    });

    core.info(`Webpack bundle diff for PR ${repo}#${pullRequestId}`);
    core.info(body);
  } catch (error) {
    core.setFailed(error);
  }
}

run();
