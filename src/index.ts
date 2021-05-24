import * as core from '@actions/core';
import * as github from '@actions/github';
import { access, constants } from 'fs';
import * as path from 'path';

import { getDiff } from './diff';
import {
  renderSection,
  renderAddedTable,
  renderBiggerTable,
  renderRemovedTable,
  renderSmallerTable,
  renderReductionCelebration,
  renderSummaryTable,
  pluralize,
  renderGithubCompareLink,
} from './render';

async function assertFileExists(path: string) {
  return new Promise<void>((resolve, reject) =>
    access(path, constants.F_OK, (error) =>
      error ? reject(new Error(`${path} does not exist`)) : resolve(),
    ),
  );
}

async function run() {
  try {
    const inputs = {
      base: {
        stats: core.getInput('base-stats-path'),
        report: core.getInput('base-bundle-analysis-report-path'),
      },
      head: {
        stats: core.getInput('head-stats-path'),
        report: core.getInput('head-bundle-analysis-report-path'),
      },
      githubToken: core.getInput('github-token'),
    };

    const runId = github.context.runId;
    const owner = github.context.repo.owner;
    const repo = github.context.repo.repo;
    const headSha = github.context.sha;
    const baseSha = github.context.payload.pull_request?.base.sha;
    const pullRequestId = github.context.issue.number;
    if (!pullRequestId) {
      throw new Error('Could not find the PR id');
    }

    const paths = {
      base: {
        stats: path.resolve(process.cwd(), inputs.base.stats),
        report: path.resolve(process.cwd(), inputs.base.report),
      },
      head: {
        stats: path.resolve(process.cwd(), inputs.head.stats),
        report: path.resolve(process.cwd(), inputs.head.report),
      },
    };

    assertFileExists(paths.base.stats);
    assertFileExists(paths.base.report);
    assertFileExists(paths.head.stats);
    assertFileExists(paths.head.report);

    const analysis = {
      base: {
        stats: require(paths.base.stats),
        report: require(paths.base.report),
      },
      head: {
        stats: require(paths.head.stats),
        report: require(paths.head.report),
      },
    };

    const diff = getDiff(analysis);

    const numberOfChanges = Object.entries(diff)
      .filter(([kind]) => kind !== 'unchanged')
      .map(([_, assets]) => assets.length)
      .reduce((total, size) => total + size, 0);

    // If there are no changes whatsoever, don't report.
    // Avoid adding noise to backend-only PRs
    if (numberOfChanges === 0) {
      core.info(
        `No significant bundle changes to report for ${repo}#${pullRequestId} at ${baseSha}…${headSha}`,
      );
      return;
    }

    const octokit = github.getOctokit(inputs.githubToken);

    const body = [
      `### Comparing bundles sizes between ${renderGithubCompareLink(
        baseSha,
        headSha,
      )}`,

      'Sizes are minified bytes, and not gzipped.',

      renderSection({
        title: 'Summary of changes',
        children: renderSummaryTable({ diff }),
      }),

      renderSection({
        title: `⚠️ ${diff.bigger.length} ${pluralize(
          diff.bigger.length,
          'bundle',
          'bundles',
        )} got bigger`,
        isEmpty: diff.bigger.length === 0,
        children: renderBiggerTable({ assets: diff.bigger }),
      }),

      renderSection({
        title: `🎉 ${diff.smaller.length} ${pluralize(
          diff.smaller.length,
          'bundle',
          'bundles',
        )} got smaller`,
        isEmpty: diff.smaller.length === 0,
        children: renderSmallerTable({ assets: diff.smaller }),
      }),

      renderSection({
        title: `🤔 ${diff.added.length} ${pluralize(
          diff.added.length,
          'bundle was',
          'bundles were',
        )} added`,
        isEmpty: diff.added.length === 0,
        children: renderAddedTable({ assets: diff.added }),
      }),

      renderSection({
        title: `👏 ${diff.removed.length} ${pluralize(
          diff.removed.length,
          'bundle was',
          'bundles were',
        )} removed`,
        isEmpty: diff.removed.length === 0,
        children: renderRemovedTable({ assets: diff.removed }),
      }),

      renderReductionCelebration({ diff }),

      '---',

      `[Visit the workflow page](https://github.com/launchdarkly/gonfalon/actions/runs/${runId}) to download the artifacts for this run. You can visualize those with [webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer) or online with [statoscope](https://statoscope.tech/).`,
    ]
      .filter((section) => !!section)
      .join('\n');

    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: pullRequestId,
      body,
    });

    core.info(
      `Webpack bundle diff for PR ${repo}#${pullRequestId} at ${baseSha}…${headSha}`,
    );
    core.info(body);
  } catch (error) {
    core.setFailed(error);
  }
}

run();
