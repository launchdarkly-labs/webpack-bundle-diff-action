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
  pluralize,
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

    const owner = github.context.repo.owner;
    const repo = github.context.repo.repo;
    const sha = github.context.sha;
    const pullRequestId = github.context.issue.number;
    if (!pullRequestId) {
      throw new Error('Could not find the PR id');
    }

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

    const numberOfChanges = Object.entries(diff)
      .map(([kind, assets]) => assets.length)
      .reduce((total, size) => total + size, 0);

    // If there are no changes whatsoever, don't report.
    // Avoid adding noise to backend-only PRs
    if (numberOfChanges === 0) {
      core.info(`No bundle changes to report for ${repo}#${pullRequestId}`);
      return;
    }

    const octokit = github.getOctokit(inputs.githubToken);

    const body = [
      `### Webpack bundle diff at ${sha}`,
      renderSection({
        title: `⚠️ ${diff.bigger.length} ${pluralize(
          diff.bigger.length,
          'bundle',
          'bundles',
        )} got bigger`,
        assets: diff.bigger,
        formatter: getBiggerTable,
      }),

      renderSection({
        title: `🎉 ${diff.smaller.length} ${pluralize(
          diff.smaller.length,
          'bundle',
          'bundles',
        )} got smaller`,
        assets: diff.smaller,
        formatter: getSmallerTable,
      }),

      renderSection({
        title: `🤔 ${diff.added.length} ${pluralize(
          diff.added.length,
          'bundle',
          'bundles',
        )} were added`,
        assets: diff.added,
        formatter: getAddedTable,
      }),

      renderSection({
        title: `👏 ${diff.removed.length} ${pluralize(
          diff.removed.length,
          'bundle',
          'bundles',
        )} were removed`,
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
